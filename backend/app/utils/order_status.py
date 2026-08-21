"""
Order fulfilment state machine.

Status is customer-visible, so it has to be trustworthy: a vendor must not be able
to jump straight from Paid to Collected and skip the timeline. Transitions are
validated server-side rather than trusting whatever the client sends.

    Pending Payment ─┬─> Paid ─> Preparing ─> Ready ─> Collected
                     └─> Payment Failed
"""

PENDING = 'Pending Payment'
PAID = 'Paid'
FAILED = 'Payment Failed'
PREPARING = 'Preparing'
READY = 'Ready'
COLLECTED = 'Collected'
CANCELLED = 'Cancelled'

# Steps a vendor is allowed to drive from the orders screen.
VENDOR_TRANSITIONS = {
    PAID: {PREPARING, CANCELLED},
    PREPARING: {READY, CANCELLED},
    READY: {COLLECTED},
}

ALL_STATUSES = {PENDING, PAID, FAILED, PREPARING, READY, COLLECTED, CANCELLED}

# Ordered for progress indicators in the UI.
CUSTOMER_TIMELINE = [PAID, PREPARING, READY, COLLECTED]


def can_transition(current, target):
    return target in VENDOR_TRANSITIONS.get(current, set())


def allowed_next(current):
    return sorted(VENDOR_TRANSITIONS.get(current, set()))


def timeline_index(status):
    """Position on the customer-facing timeline, or -1 if off it (failed/cancelled)."""
    try:
        return CUSTOMER_TIMELINE.index(status)
    except ValueError:
        return -1


# Paid for but not yet in the customer's hands. A vendor going offline while any of
# these exist strands someone who has already been charged.
UNFULFILLED_STATUSES = (PAID, PREPARING, READY)
