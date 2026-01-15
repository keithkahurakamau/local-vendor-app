# Local Vendor App (Hyper-Local Inventory & Finder)

## 📖 Project Overview
The **Local Vendor App** is a full-stack "Hyper-Local" marketplace designed to bridge the gap between street vendors and nearby customers. Unlike traditional delivery apps, this platform focuses on **real-time data freshness**.

The core algorithmic constraint is the **Freshness Timer**: Vendors are only visible in search results if they have "checked in" within the last **3 hours**. This ensures customers never walk to a vendor only to find them closed or moved. The application features geospatial searching (within a 5km radius), route optimization using **Dijkstra’s Algorithm (via OSRM)**, and integrated **M-Pesa Express (STK Push)** payments.

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