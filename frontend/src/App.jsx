import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import useActivityTracker from './hooks/useActivityTracker';
import 'leaflet/dist/leaflet.css';

// Import pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import VendorLogin from './pages/vendor/VendorLogin';
import VendorDashboard from './pages/vendor/VendorDashboard';
import VendorCheckIn from './pages/vendor/VendorCheckIn';
import VendorRegister from './pages/vendor/newVendorRegister';
import ViewOrders from './pages/vendor/viewOrders';
import LandingPage from './pages/customer/landingPage';
import MapPage from './pages/customer/mapPage';
import OrderPage from './pages/orderPay/orderPage';
import PaymentDetails from './pages/orderPay/paymentDetails';

function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/customer" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/vendor/login" element={<VendorLogin />} />
          <Route path="/vendor/dashboard" element={<VendorDashboard />} />
          <Route path="/vendor/checkin" element={<VendorCheckIn />} />
          <Route path="/vendor/register" element={<VendorRegister />} />
          <Route path="/vendor/orders" element={<ViewOrders />} />
          <Route path="/customer" element={<LandingPage />} />
          <Route path="/customer/map" element={<MapPage />} />
          <Route path="/order/:vendorId" element={<OrderPage />} />
          <Route path="/payment" element={<PaymentDetails />} />
        </Routes>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;
