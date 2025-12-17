import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';

// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
// AdminDashboard from './pages/admin/AdminDashboard';

// Vendor pages
import VendorLogin from './pages/vendor/VendorLogin';
import VendorCheckIn from './pages/vendor/VendorCheckIn';
import VendorRegister from './pages/vendor/newVendorRegister';

// Customer pages
import LandingPage from './pages/customer/landingPage';
import MapPage from './pages/customer/mapPage';

// Order/Payment pages
import OrderPage from './pages/orderPay/orderPage';
import PaymentDetails from './pages/orderPay/paymentDetails';
import OrdersView from "./pages/vendor/viewOrders";

// CRITICAL: Leaflet CSS (Required for Maps)
import 'leaflet/dist/leaflet.css';

function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <Routes>
          {/* Default route - customer landing page */}
          <Route path="/" element={<LandingPage />} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          {/*<Route path="/admin/dashboard" element={<AdminDashboard />} /> */}

          {/* Vendor routes */}
          <Route path="/vendor/login" element={<VendorLogin />} />
          <Route path="/vendor/checkin" element={<VendorCheckIn />} />
          <Route path="/vendor/register" element={<VendorRegister />} />

          {/* Customer routes */}
          <Route path="/customer/mapPage" element={<MapPage />} />

          {/* Order/Payment routes */}
          <Route path="/order" element={<OrderPage />} />
          <Route path="/payment" element={<PaymentDetails />} />
           {/* Orders View Page */}
          <Route path="/orders" element={<OrdersView />} />
        </Routes>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;