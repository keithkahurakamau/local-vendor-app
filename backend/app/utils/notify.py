"""
In-app notifications.

Creating one must never be able to break the action that triggered it - a vendor
going live matters more than the bell updating - so every helper here swallows its
own errors, exactly like the email senders.
"""
from flask import current_app

from app.extensions import db


def push(user_id, kind, title, body=None, link=None, commit=True):
    """Create one notification. Returns it, or None if anything went wrong."""
    from app.models import Notification

    if not user_id:
        return None
    try:
        note = Notification(user_id=user_id, kind=kind, title=title, body=body, link=link)
        db.session.add(note)
        if commit:
            db.session.commit()
        return note
    except Exception as e:
        current_app.logger.warning('notification push failed: %s', e)
        try:
            db.session.rollback()
        except Exception:
            pass
        return None


def push_many(entries):
    """Create several at once; one commit for the batch."""
    from app.models import Notification

    made = 0
    try:
        for e in entries:
            if not e.get('user_id'):
                continue
            db.session.add(Notification(
                user_id=e['user_id'], kind=e['kind'], title=e['title'],
                body=e.get('body'), link=e.get('link'),
            ))
            made += 1
        db.session.commit()
    except Exception as e:
        current_app.logger.warning('notification batch failed: %s', e)
        try:
            db.session.rollback()
        except Exception:
            pass
        return 0
    return made
