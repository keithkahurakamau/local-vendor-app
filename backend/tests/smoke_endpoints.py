"""Live smoke test: exercises every route against a running dev server.

    python run.py                      # in one terminal
    python tests/smoke_endpoints.py    # in another

Unlike test_backend.py (isolated SQLite), this hits the real app over HTTP and is
safe to re-run: every mutating call is uniquely keyed per run.
"""
import json
import urllib.request
import urllib.error
import uuid

RUN = uuid.uuid4().hex[:8]   # unique per run so re-runs are idempotent

BASE = 'http://127.0.0.1:5000'
results = []


def call(method, path, body=None, token=None, expect=200, note=''):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if data:
        req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            code, payload = r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        code, payload = e.code, e.read().decode()
    except Exception as e:
        code, payload = 0, str(e)

    ok = code == expect
    results.append((f'{method} {path}', expect, code, ok, note))
    try:
        return code, json.loads(payload)
    except Exception:
        return code, payload


# ---------------------------------------------------------------- public
call('GET', '/', note='API root')
call('GET', '/api/customer/nearby?lat=-1.2864&lon=36.8172&radius=5000', note='CBD discovery')
call('GET', '/api/customer/nearby', expect=400, note='missing params rejected')
call('GET', '/api/customer/search?item=pilau&lat=-1.2649&lon=36.8020', note='item search')
call('GET', '/api/customer/search', expect=400, note='missing params rejected')
call('GET', '/api/customer/search?item=x&lat=bad&lon=0', expect=400, note='bad coords rejected')
call('GET', '/api/customer/payment-status/HL-UNKNOWN', note='unknown id -> PENDING not error')

# ---------------------------------------------------------------- auth
call('POST', '/api/auth/login', {'email': 'nope@x.com', 'password': 'x'}, expect=401,
     note='bad credentials')
call('POST', '/api/auth/register', {'email': 'x@y.com'}, expect=400, note='missing fields')
call('POST', '/api/auth/register',
     {'username': f'smoke_{RUN}', 'email': f'smoke_{RUN}@test.io',
      'phone_number': f'+2547{int(RUN,16)%1000000000:09d}', 'password': 'Password123', 'role': 'customer'},
     expect=201, note='register customer')
call('POST', '/api/auth/register',
     {'username': f'smoke2_{RUN}', 'email': f'smoke_{RUN}@test.io',
      'phone_number': f'+2547{(int(RUN,16)+1)%1000000000:09d}', 'password': 'Password123'},
     expect=409, note='duplicate email rejected')
call('POST', '/api/auth/forgot-password', {'email': 'ghost@nowhere.io'},
     note='no account-existence leak')
call('GET', '/api/auth/reset-password/bogus-token', expect=400, note='bad reset token')
call('POST', '/api/auth/reset-password/bogus-token', {'password': 'Password123'},
     expect=400, note='bad reset token')
call('POST', '/api/auth/google-login', {'token': 'not-a-real-token'}, expect=401,
     note='invalid google token')

_, vendor_login = call('POST', '/api/auth/login',
                       {'email': 'njeri@hyperlocal.co.ke', 'password': 'Password123'},
                       note='vendor login')
vtok = vendor_login.get('token') if isinstance(vendor_login, dict) else None

_, cust_login = call('POST', '/api/auth/login',
                     {'email': 'wanjiku@example.com', 'password': 'Password123'},
                     note='customer login')
ctok = cust_login.get('token') if isinstance(cust_login, dict) else None

_, admin_login = call('POST', '/api/admin/login',
                      {'email': 'admin@hyperlocal.com', 'password': 'Password123'},
                      note='admin login')
atok = admin_login.get('token') if isinstance(admin_login, dict) else None

# ---------------------------------------------------------------- vendor
call('GET', '/api/vendor/status', expect=401, note='anonymous blocked')
call('POST', '/api/vendor/checkin', {'latitude': 0, 'longitude': 0}, expect=401,
     note='anonymous blocked')
call('POST', '/api/vendor/upload', expect=401, note='anonymous upload blocked')
call('GET', '/api/vendor/orders', expect=401, note='anonymous blocked')

call('GET', '/api/vendor/status', token=ctok, expect=403, note='customer token rejected')
call('POST', '/api/vendor/checkin', {'latitude': 0, 'longitude': 0}, token=ctok,
     expect=403, note='customer cannot become a vendor')

call('GET', '/api/vendor/status', token=vtok, note='vendor status')
call('GET', '/api/vendor/orders', token=vtok, note='vendor orders')
call('POST', '/api/vendor/generate-description', {'item_name': 'Mutura'}, token=vtok,
     note='AI description (falls back)')
call('PUT', '/api/vendor/profile', {'business_name': 'Mama Njeri Kibandaski'}, token=vtok,
     note='update profile')
call('POST', '/api/vendor/checkin',
     {'latitude': -1.2864, 'longitude': 36.8172, 'address': 'Kimathi Street, Nairobi CBD',
      'menu_items': [{'name': 'Ugali & Sukuma', 'price': 120, 'desc': 'Fresh'}]},
     token=vtok, note='check in')

# ---------------------------------------------------------------- admin
call('GET', '/api/admin/vendors', expect=401, note='anonymous blocked')
call('GET', '/api/admin/vendors', token=vtok, expect=403, note='vendor token rejected')
call('GET', '/api/admin/logs', token=vtok, expect=403, note='vendor token rejected')
call('GET', '/api/admin/vendors', token=atok, note='admin vendors')
call('GET', '/api/admin/logs', token=atok, note='admin transaction logs')

# ---------------------------------------------------------------- customer detail + pay
code, nearby = call('GET', '/api/customer/nearby?lat=-1.2864&lon=36.8172&radius=5000',
                    note='discovery after checkin')
vid = nearby['vendors'][0]['vendor_id'] if isinstance(nearby, dict) and nearby.get('vendors') else 1
call('GET', f'/api/customer/vendor/{vid}', note='vendor detail')
call('GET', '/api/customer/vendor/999999', expect=404, note='unknown vendor')
call('POST', '/api/customer/pay', {'vendorId': vid}, expect=400, note='missing pay fields')
call('POST', '/api/customer/callback', {'not': 'a callback'}, note='malformed callback ignored')

# ---------------------------------------------------------------- new features
call('GET', '/api/vendor/analytics', expect=401, note='anonymous blocked')
call('GET', '/api/vendor/analytics', token=ctok, expect=403, note='customer token rejected')
call('GET', '/api/vendor/analytics', token=vtok, note='vendor analytics')

call('GET', '/api/customer/orders', expect=401, note='anonymous blocked')
code, mine = call('GET', '/api/customer/orders', token=ctok, note='customer order history')
orders = mine.get('orders', []) if isinstance(mine, dict) else []
if orders:
    call('GET', f"/api/customer/orders/{orders[0]['order_number']}", token=ctok,
         note='own order detail')
call('GET', '/api/customer/orders/HL-NOPE00', token=ctok, expect=404, note='unknown order')

call('PATCH', '/api/vendor/order/999999/status', {'status': 'Preparing'}, token=vtok,
     expect=404, note='unknown order')
call('PATCH', '/api/vendor/order/1/status', {'status': 'Preparing'}, token=ctok,
     expect=403, note='customer cannot drive status')

call('GET', '/api/customer/favourites', expect=401, note='anonymous blocked')
call('GET', '/api/customer/favourites', token=ctok, note='list favourites')
call('POST', f'/api/customer/favourites/{vid}', token=ctok, expect=201, note='follow vendor')
call('POST', f'/api/customer/favourites/{vid}', token=ctok, expect=200, note='re-follow is idempotent')
call('DELETE', f'/api/customer/favourites/{vid}', token=ctok, note='unfollow vendor')
call('POST', '/api/customer/favourites/999999', token=ctok, expect=404, note='unknown vendor')

call('GET', f'/api/customer/vendor/{vid}/reviews', note='public vendor reviews')
call('POST', '/api/customer/orders/HL-NOPE00/review', {'rating': 5}, token=ctok,
     expect=404, note='review unknown order')

# ---------------------------------------------------------------- report
print(f"\n{'ENDPOINT':<52} {'WANT':<6} {'GOT':<6} {'':<4} NOTE")
print('-' * 118)
passed = 0
for name, want, got, ok, note in results:
    passed += ok
    print(f"{name:<52} {want:<6} {got:<6} {'PASS' if ok else 'FAIL':<4} {note}")
print('-' * 118)
print(f'{passed}/{len(results)} passed, {len(results) - passed} failed')
