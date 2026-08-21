"""
Go-live notifications.

When a vendor checks in, anyone who has favourited them gets an email. Sends are
deliberately best-effort: a vendor going live matters more than a notification, so
a mail failure is logged and swallowed rather than failing the check-in request.
"""
from flask import current_app
from flask_mail import Message

from app.extensions import mail
from app.utils.notify import push_many


def notify_followers_of_checkin(vendor, location):
    """Returns the number of emails sent. Never raises."""
    # imported here to avoid a circular import at module load
    from app.models import Favourite, User

    try:
        favourites = Favourite.query.filter_by(vendor_id=vendor.id).all()
        if not favourites:
            return 0

        name = vendor.business_name or vendor.username
        frontend = (current_app.config.get('FRONTEND_URL') or 'http://localhost:5173').rstrip('/')
        where = location.address or 'their usual spot'

        # The bell is the durable record; email is the nudge.
        push_many([{
            'user_id': f.customer_id,
            'kind': 'vendor_live',
            'title': f'{vendor.business_name or vendor.username} is live',
            'body': f"Now at {location.address or 'their usual spot'} for the next 3 hours.",
            'link': f'/order/{vendor.id}',
        } for f in favourites])

        sent = 0
        for fav in favourites:
            customer = User.query.get(fav.customer_id)
            if not customer or not customer.email:
                continue
            try:
                mail.send(Message(
                    subject=f'{name} is live now',
                    recipients=[customer.email],
                    html=f"""
                        <div style="font-family: Manrope, Arial, sans-serif; padding: 24px; color: #2D2D2D;">
                          <h2 style="color:#FF6B35; margin:0 0 8px;">{name} just went live</h2>
                          <p style="margin:0 0 16px;">They're at <strong>{where}</strong> for the next 3 hours.</p>
                          <a href="{frontend}/order/{vendor.id}"
                             style="background:#FF6B35;color:#fff;padding:12px 22px;border-radius:999px;
                                    text-decoration:none;font-weight:700;display:inline-block;">
                            See the menu
                          </a>
                          <p style="font-size:12px;color:#8D8D8D;margin-top:22px;">
                            You're getting this because you follow {name} on HyperLocal.
                          </p>
                        </div>
                    """,
                ))
                sent += 1
            except Exception as e:
                current_app.logger.warning('go-live email to %s failed: %s', customer.email, e)

        return sent
    except Exception as e:
        current_app.logger.warning('go-live notification pass failed: %s', e)
        return 0


def notify_customers_vendor_closed(vendor, orders):
    """
    Tell customers their vendor has shut with their order unfulfilled.

    Money has already left their M-Pesa account, so silence is the worst possible
    outcome - they need to know to chase the vendor or cancel. Best-effort like the
    go-live mail: closing must never fail because SMTP is down.
    """
    from app.models import User

    if not orders:
        return 0

    name = vendor.business_name or vendor.username
    frontend = (current_app.config.get('FRONTEND_URL') or 'http://localhost:5173').rstrip('/')
    phone = vendor.phone_number or 'not provided'

    push_many([{
        'user_id': o.customer_id,
        'kind': 'vendor_closed',
        'title': f'{name} closed with your order unfinished',
        'body': f'{o.order_number} was still {o.status}. Call {phone} or cancel it.',
        'link': '/customer/profile',
    } for o in orders if o.customer_id])

    sent = 0
    for order in orders:
        customer = User.query.get(order.customer_id) if order.customer_id else None
        if not customer or not customer.email:
            continue
        try:
            mail.send(Message(
                subject=f'{name} has closed - your order {order.order_number}',
                recipients=[customer.email],
                html=f"""
                    <div style="font-family: Manrope, Arial, sans-serif; padding: 24px; color: #2D2D2D;">
                      <h2 style="color:#EF476F; margin:0 0 8px;">{name} has closed for the day</h2>
                      <p style="margin:0 0 12px;">
                        Your order <strong>{order.order_number}</strong>
                        (KES {order.total_amount:.0f}) was still <strong>{order.status}</strong>
                        when they shut.
                      </p>
                      <p style="margin:0 0 16px;">
                        Call them on <strong>{phone}</strong> to arrange collection, or cancel
                        the order from your account.
                      </p>
                      <a href="{frontend}/customer/profile"
                         style="background:#FF6B35;color:#fff;padding:12px 22px;border-radius:999px;
                                text-decoration:none;font-weight:700;display:inline-block;">
                        View my orders
                      </a>
                    </div>
                """,
            ))
            sent += 1
        except Exception as e:
            current_app.logger.warning('close notice to %s failed: %s', customer.email, e)

    return sent
