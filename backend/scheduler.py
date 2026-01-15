import time
from datetime import datetime
from app import create_app, db
from app.models import VendorLocation
import os

app = create_app(os.getenv('FLASK_CONFIG') or 'default')

def run_scheduler():
    """
    Dedicated process to monitor vendor inactivity.
    Run this as a separate worker in production.
    """
    print("Scheduler: Starting vendor auto-close monitor...")
    
    while True:
        with app.app_context():
            try:
                now = datetime.utcnow()
                # Find vendors that are OPEN and past their closing time
                expired_locations = VendorLocation.query.filter(
                    VendorLocation.auto_close_at.isnot(None),
                    VendorLocation.auto_close_at <= now,
                    VendorLocation.is_open == True
                ).all()

                if expired_locations:
                    count = 0
                    for location in expired_locations:
                        location.is_open = False
                        location.auto_close_at = None
                        location.updated_at = now
                        count += 1
                    
                    db.session.commit()
                    print(f"[{now}] Scheduler: Auto-closed {count} vendors.")
                
            except Exception as e:
                print(f"Scheduler Error: {e}")
                db.session.rollback()
        
        # Check every 5 minutes
        time.sleep(300)

if __name__ == "__main__":
    run_scheduler()