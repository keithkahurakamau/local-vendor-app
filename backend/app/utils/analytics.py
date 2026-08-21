"""
Vendor analytics.

Read-side only: everything is derived from existing Order and Transaction rows,
so this needed no schema change.

Revenue counts *only* orders that actually completed. The trap in doing this
naively is summing every order regardless of status, which silently inflates
revenue with failed and still-pending payments.
"""
from collections import defaultdict
from datetime import datetime, timedelta

# An order that reached any of these has been paid for; the later states are
# fulfilment steps, not payment steps.
PAID_STATUSES = {'paid', 'completed', 'successful', 'preparing', 'ready', 'collected'}
FAILED_STATUSES = {'payment failed', 'failed', 'cancelled'}


def _bucket(status):
    s = (status or '').strip().lower()
    if s in PAID_STATUSES:
        return 'paid'
    if s in FAILED_STATUSES:
        return 'failed'
    return 'pending'


def build_analytics(orders, now=None):
    """
    Summarise a vendor's orders.

    `orders` must already be scoped to a single vendor - this does no filtering of
    its own, so the caller owns isolation.
    """
    now = now or datetime.utcnow()
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)

    revenue = {'total': 0.0, 'today': 0.0, 'week': 0.0}
    counts = {'paid': 0, 'pending': 0, 'failed': 0, 'total': 0}
    item_qty = defaultdict(int)
    item_revenue = defaultdict(float)
    by_hour = defaultdict(int)
    phone_orders = defaultdict(int)

    for order in orders:
        counts['total'] += 1
        bucket = _bucket(order.status)
        counts[bucket] += 1

        created = order.created_at or now
        by_hour[created.hour] += 1

        if bucket != 'paid':
            continue

        amount = float(order.total_amount or 0)
        revenue['total'] += amount
        if created >= day_ago:
            revenue['today'] += amount
        if created >= week_ago:
            revenue['week'] += amount

        if order.customer_phone:
            phone_orders[order.customer_phone] += 1

        # `items` is schemaless JSON - tolerate anything that is not a list of dicts
        for item in (order.items if isinstance(order.items, list) else []):
            if not isinstance(item, dict):
                continue
            name = str(item.get('name') or '').strip()
            if not name:
                continue
            try:
                qty = int(item.get('qty') or 1)
            except (TypeError, ValueError):
                qty = 1
            try:
                price = float(item.get('price') or 0)
            except (TypeError, ValueError):
                price = 0.0
            item_qty[name] += qty
            item_revenue[name] += price * qty

    top_items = sorted(
        ({'name': n, 'qty': item_qty[n], 'revenue': round(item_revenue[n], 2)}
         for n in item_qty),
        key=lambda i: (-i['revenue'], -i['qty'], i['name']),
    )[:8]

    peak_hours = sorted(
        ({'hour': h, 'orders': c} for h, c in by_hour.items()),
        key=lambda x: (-x['orders'], x['hour']),
    )[:5]

    paid_count = counts['paid']
    return {
        'revenue': {k: round(v, 2) for k, v in revenue.items()},
        'orders': counts,
        'average_order_value': round(revenue['total'] / paid_count, 2) if paid_count else 0,
        'top_items': top_items,
        'peak_hours': peak_hours,
        'customers': {
            'unique': len(phone_orders),
            'repeat': sum(1 for n in phone_orders.values() if n > 1),
        },
        'generated_at': now.isoformat(),
    }
