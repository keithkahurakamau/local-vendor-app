import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// CRITICAL: Leaflet CSS (Required for Maps)
import 'leaflet/dist/leaflet.css';

// Import all page components
import VendorLogin from './pages/vendor/VendorLogin';
import VendorCheckIn from './pages/vendor/VendorCheckIn';
import VendorRegister from './pages/vendor/newVendorRegister';
import ViewOrders from './pages/vendor/viewOrders';
import LandingPage from './pages/customer/landingPage';
import MapPage from './pages/customer/mapPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import OrderPage from './pages/orderPay/orderPage';
import PaymentDetails from './pages/orderPay/paymentDetails';

function App() {
  return (
    <Router>
      <Routes>
        {/* Default route to customer landing page */}
        <Route path="/" element={<Navigate to="/customer/landing" replace />} />

        {/* Customer routes */}
        <Route path="/customer/landing" element={<LandingPage />} />
        <Route path="/customer/map" element={<MapPage />} />

        {/* Vendor routes */}
        <Route path="/vendor/login" element={<VendorLogin />} />
        <Route path="/vendor/checkin" element={<VendorCheckIn />} />
        <Route path="/vendor/register" element={<VendorRegister />} />
        <Route path="/vendor/orders" element={<ViewOrders />} />

        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* Order and Payment routes */}
        <Route path="/order" element={<OrderPage />} />
        <Route path="/payment" element={<PaymentDetails />} />
      </Routes>
    </Router>
  );
}

export default App;
