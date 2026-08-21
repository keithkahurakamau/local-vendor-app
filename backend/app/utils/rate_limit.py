"""
Sliding-window rate limiting.

This exists for one route: /customer/pay. Every call there sends a real STK push
to a real handset, so an unthrottled endpoint is a way to make a stranger's phone
buzz repeatedly - the abuse is the prompt itself, not the compute. Guest checkout
means there is no JWT to key on, so the phone number in the payload is the
identity we have.

Two keys are checked, because either alone is trivially bypassed:
  * the phone number  - stops one victim being targeted repeatedly
  * the caller's IP   - stops one attacker cycling through numbers

State is per-process and in-memory. With more than one worker each gets its own
counters, so the effective limit multiplies by the worker count; that is a known
and acceptable trade for not requiring Redis on a free-tier deploy. If this ever
runs behind several workers and the limit has to be exact, back `_HITS` with Redis
and keep this interface.
"""
import time
import threading
from collections import defaultdict, deque

_HITS = defaultdict(deque)
_LOCK = threading.Lock()

# Pruning every call would be O(keys); doing it periodically keeps the common
# path cheap while stopping the dict growing without bound.
_last_prune = 0.0
_PRUNE_EVERY = 300


def _prune(now, window):
    global _last_prune
    if now - _last_prune < _PRUNE_EVERY:
        return
    _last_prune = now
    for key in list(_HITS):
        hits = _HITS[key]
        while hits and hits[0] <= now - window:
            hits.popleft()
        if not hits:
            del _HITS[key]


def check(key, max_calls, per_seconds):
    """
    Record a hit against `key` and say whether it is allowed.

    Returns (allowed, retry_after_seconds). retry_after is 0 when allowed.
    A rejected call is NOT recorded, so hammering a blocked key cannot extend
    its own lockout indefinitely.
    """
    if not key:
        return True, 0

    now = time.time()
    with _LOCK:
        _prune(now, per_seconds)
        hits = _HITS[key]
        while hits and hits[0] <= now - per_seconds:
            hits.popleft()

        if len(hits) >= max_calls:
            return False, max(1, int(per_seconds - (now - hits[0])) + 1)

        hits.append(now)
        return True, 0


def reset():
    """Test helper - the window is wall-clock, so suites must start clean."""
    with _LOCK:
        _HITS.clear()
