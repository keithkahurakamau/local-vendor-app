# local-vendor-app
## Hyper-Local Vendor Inventory & Finder (MVP v1.0)

## 📖 Project Overview
The **Hyper-Local Vendor Inventory & Finder** is a full-stack web application designed to connect customers with nearby food vendors based on real-time menu availability.

The core goal of this project is to provide a proximity-based search (within **5 km**) that ensures data freshness by only displaying vendors who have updated their location and menu within the last **3 hours**. The application also features integrated payments using the **M-Pesa C2B STK Push** system.

### Key Features
* **Customer:**
    * **Real-time Search:** Filter vendors by food item, proximity (5km radius), and freshness (<3 hours).
    * **Map Visualization:** Dynamic interactive map showing vendor locations and details.
    * **Instant Payment:** Seamless "Pay & Order" functionality via M-Pesa STK Push.
* **Vendor:**
    * **Check-In UI:** Mobile-friendly interface for vendors to broadcast their current location and daily menu.
    * **Auto-Offline:** Vendors are automatically removed from search results if they haven't checked in for over 3 hours.
* **Administrator:**
    * **Dashboard:** View a map of all currently active vendors.
    * **Transaction Logs:** Monitor successful and failed M-Pesa payments.

---

## 🛠️ Technologies Used

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | **React** | SPA with Hooks (useState, useEffect) and client-side routing. |
| **Styling** | **Tailwind CSS** | Utility-first CSS for responsive mobile-first design. |
| **Maps** | **Leaflet / Google Maps** | Dynamic marker rendering and user location capture. |
| **Backend** | **Python (Flask)** | RESTful API with geospatial filtering (Haversine) and JWT Auth. |
| **Database** | **PostgreSQL** | Relational DB with spatial data logic and normalized schema. |
| **Payments** | **Safaricom Daraja API** | Secure C2B STK Push integration. |
| **Version Control** | **Git Flow** | Structured workflow using `main`, `develop`, and `feature/*` branches. |

---

## 🔌 Primary API Endpoints

### 🟢 Public Routes (Customer)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/search` | Search for items. Requires params: `item`, `lat`, `lon`. Filters by 5km radius & 3hr freshness. |
| `POST` | `/pay` | Triggers M-Pesa STK Push. Payload: `{ vendor_id, amount, customer_phone }`. |

### 🟠 Vendor Routes (Protected)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/vendor/register` | Register a new vendor account. |
| `POST` | `/vendor/login` | Authenticate vendor. Returns **Vendor JWT**. |
| `POST` | `/vendor/update-location` | **(Auth Required)** Updates vendor coordinates and menu items. Resets the 3-hour timer. |

### 🔴 Administrator Routes (RBAC Protected)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/admin/login` | Authenticate admin. Returns **Admin JWT**. |
| `GET` | `/admin/logs` | **(Auth Required)** View transaction logs and system activity. |

---

## ⚙️ Setup & Installation

### Prerequisites
* Node.js & npm
* Python 3.8+
* PostgreSQL
* Git

### 0. Clone Repository
```bash
# Clone the repository
git clone <repository-url>
```

### 1. Database Setup
1.  Create a PostgreSQL database named `vendor_inventory_db`.
2.  Ensure you have the necessary credentials configured.

### 2. Backend (Flask)
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure Environment Variables
# Create a .env file and add:
# DATABASE_URL=postgresql://user:password@localhost/vendor_inventory_db
# SECRET_KEY=your_secret_key
# MPESA_CONSUMER_KEY=your_key
# MPESA_CONSUMER_SECRET=your_secret

# Run Database Migrations (if using Flask-Migrate/SQLAlchemy)
flask db upgrade

# Start the Server
flask run
```

### 3. Frontend (React)
```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Configure Environment Variables
# Create a .env.local file and add:
# VITE_API_URL=http://localhost:5000

# Start the Development Server
npm run dev
```

---

## 🤝 Contribution & Workflow (Git Flow)
This project strictly adheres to the Git Flow workflow.

main: Production-ready code.

develop: Integration branch for all features.

feature/*: Create a new branch for every task (e.g., feature/create-login-ui).

Pull Request Process:

Checkout develop and pull the latest changes.

Create a feature branch: git checkout -b feature/your-feature-name.

Commit changes with clear messages.

Push to remote and open a Pull Request (PR) targeting develop.

Wait for code review and approval before merging.
