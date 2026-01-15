# Local Vendor App (Hyper-Local Inventory & Finder)

## 📖 Project Overview
The **Local Vendor App** is a full-stack "Hyper-Local" marketplace designed to bridge the gap between street vendors and nearby customers. Unlike traditional delivery apps, this platform focuses on **real-time data freshness**.

The core algorithmic constraint is the **Freshness Timer**: Vendors are only visible in search results if they have "checked in" within the last **3 hours**. This ensures customers never walk to a vendor only to find them closed or moved. The application features geospatial searching (within a 5km radius), route optimization using **Dijkstra's Algorithm (via OSRM)**, and integrated **M-Pesa Express (STK Push)** payments.

---

## 🚀 Key Features

### 🛒 Customer Module
* **Geospatial Search:** Finds vendors within a strict 5km radius using the Haversine formula.
* **Live Menu Availability:** Filters out vendors who haven't updated their inventory in >3 hours.
* **Secure Payments:** Integrated M-Pesa C2B STK Push (Daraja API) for instant cashless transactions.
* **GPS Tracking:** Automatically captures customer location during checkout for precise delivery.

### 🏪 Vendor Module
* **Location Broadcast:** Mobile-first "Check-In" interface to update GPS coordinates and daily menu.
* **Order Management:** Real-time view of incoming orders with payment status indicators.
* **Route Optimization:** Interactive map using **OSRM (Open Source Routing Machine)** to plot the shortest driving/walking path to the customer.
    * *Note: Location details are locked until payment is confirmed.*
* **Auto-Offline:** System automatically flags vendors as "Closed" if the freshness timer expires.

### 🛡️ Admin Module
* **System Dashboard:** Geospatial view of all active vendor nodes.
* **Transaction Logs:** Detailed audit trail of all M-Pesa transactions (Success/Failure states).

---

## 🛠️ Tech Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | React.js (Vite) | SPA Architecture, Hooks, Context API |
| **Styling** | Tailwind CSS | Responsive mobile-first design system |
| **Maps** | Leaflet.js | Map rendering, Custom Markers, Polyline routing |
| **Routing Engine** | OSRM | Shortest path calculation (Dijkstra implementation) |
| **Backend** | Python (Flask) | RESTful API, Business Logic, Scheduler |
| **Database** | PostgreSQL | Relational DB with spatial data handling |
| **ORM** | SQLAlchemy | Database abstraction and migration management |
| **Payments** | Safaricom Daraja | M-Pesa Express (STK Push) & Callbacks |
| **Cloud** | Cloudinary | Image hosting for vendor storefronts/menus |

---

## ⚙️ Setup & Installation

### Prerequisites
* Node.js (v16+) & npm
* Python (v3.10+)
* PostgreSQL Database
* **Ngrok** (Required for local M-Pesa testing)

### 1. Database Setup
Create a local PostgreSQL database:
```sql
CREATE DATABASE vendor_inventory_db;
```

### 2. Backend Setup

```bash
cd backend

# Create & Activate Virtual Environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install Dependencies
pip install -r requirements.txt

# Configure Environment Variables (.env)
# Create a .env file in /backend with:
# DATABASE_URL=postgresql://user:pass@localhost/vendor_inventory_db
# SECRET_KEY=your_jwt_secret
# CLOUDINARY_CLOUD_NAME=...
# CLOUDINARY_API_KEY=...
# CLOUDINARY_API_SECRET=...
# MPESA_CONSUMER_KEY=...
# MPESA_CONSUMER_SECRET=...
# MPESA_PASSKEY=...
# MPESA_CALLBACK_URL=https://<your-ngrok-url>.ngrok-free.app/api/customer/callback

# Run Migrations
flask db upgrade

# Start Server
python run.py
```

### 3. Frontend Setup

```bash
cd frontend

# Install Dependencies
npm install

# Start Dev Server
npm run dev
```

### 4. M-Pesa Local Testing (Crucial)

Since Safaricom cannot send callbacks to localhost, you must tunnel your backend:

1. Download and install Ngrok.
2. Run: `ngrok http 5000`
3. Copy the forwarding URL (e.g., `https://xyz.ngrok-free.app`).
4. Update `MPESA_CALLBACK_URL` in your backend `.env`.
5. Restart the Flask server.

---

## 🔌 API Documentation

### Customer Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/customer/nearby` | Fetch active vendors. Query: lat, lon, radius. |
| POST | `/api/customer/pay` | Triggers STK Push. Payload includes customerLat & customerLon for routing. |

### Vendor Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/api/vendor/checkin` | Updates last_checkin and coordinates. Resets timer. |
| GET | `/api/vendor/orders` | Fetches orders. Includes Customer GPS only if Status = Paid. |

### Admin Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/admin/logs` | Returns full transaction history (including failed API attempts). |

---

## 📁 Project Structure

```
/local-vendor-app
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py              # Flask configuration
│   │   ├── extensions.py          # Flask extensions (SQLAlchemy, etc.)
│   │   ├── models.py              # DB Models (User, Order, VendorLocation, Transaction)
│   │   ├── seed_data.py           # Seed data for testing
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── admin_routes.py    # Admin API endpoints
│   │   │   ├── auth_routes.py     # Authentication endpoints
│   │   │   ├── customer_routes.py # Customer API endpoints
│   │   │   └── vendor_routes.py   # Vendor API endpoints
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── cloudinary_service.py # Cloudinary image upload
│   │       ├── decorators.py      # Custom decorators
│   │       ├── geospatial.py      # Haversine distance logic
│   │       └── mpesa_handler.py   # Daraja API Logic (STK Push & Callback)
│   ├── migrations/                # Alembic migration scripts
│   │   └── versions/              # Migration versions
│   ├── tests/
│   │   └── test_backend.py        # Backend unit tests
│   ├── requirements.txt
│   ├── run.py                     # Application Entry Point
│   ├── scheduler.py               # Background task scheduler
│   ├── seed.py                    # Database seeding script
│   └── Procfile                   # Deployment config
│
└── frontend/
    ├── src/
    │   ├── main.jsx               # Application entry point
    │   ├── App.jsx                # Main Router
    │   ├── App.css                # Global styles
    │   ├── index.css              # Tailwind imports
    │   ├── assets/                # Static assets
    │   │   └── react.svg
    │   ├── context/
    │   │   ├── AuthContext.jsx    # Authentication state management
    │   │   └── LocationContext.jsx # Location state management
    │   ├── hooks/
    │   │   ├── useActivityTracker.js # Activity tracking hook
    │   │   └── useGeoLocation.js    # Geolocation hook
    │   ├── pages/
    │   │   ├── admin/
    │   │   │   ├── AdminDashboard.jsx # Admin dashboard with map
    │   │   │   └── AdminLogin.jsx     # Admin login page
    │   │   ├── customer/
    │   │   │   ├── landingPage.jsx    # Customer landing page
    │   │   │   └── mapPage.jsx        # Vendor map search page
    │   │   ├── orderPay/
    │   │   │   ├── orderPage.jsx        # Order placement page
    │   │   │   ├── paymentDetails.jsx   # Payment details with M-Pesa
    │   │   │   ├── PaymentSuccess.jsx   # Success page
    │   │   │   └── PaymentFailed.jsx    # Failure page
    │   │   └── vendor/
    │   │       ├── newVendorRegister.jsx # Vendor registration
    │   │       ├── VendorLogin.jsx       # Vendor login
    │   │       ├── VendorDashboard.jsx   # Vendor dashboard
    │   │       ├── VendorCheckIn.jsx     # Vendor check-in with GPS
    │   │       └── viewOrders.jsx        # Order management with OSRM
    │   └── services/
    │       ├── api.js              # Axios API service
    │       ├── authService.js      # Authentication service
    │       └── mapService.js       # Map & vendor service
    ├── public/
    │   ├── images/                 # Public images
    │   └── vite.svg
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    └── eslint.config.js
```

---

## 🤝 Contribution & Workflow

This project follows Git Flow:
* `main`: Production-ready code.
* `develop`: Staging/Integration branch.
* `feature/<name>`: Feature branches.

License: MIT

