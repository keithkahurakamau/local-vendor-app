import React from 'react';
import { Routes, Route } from 'react-router-dom';

// ... imports ...
import LandingPage from './pages/customer/landingPage';
import MapPage from './pages/customer/mapPage';
import OrderPage from './pages/orderPay/orderPage';
import PaymentDetails from './pages/orderPay/paymentDetails';
import PaymentSuccess from './pages/orderPay/PaymentSuccess';
import PaymentFailed from './pages/orderPay/PaymentFailed';
import CustomerProfile from './pages/customer/CustomerProfile';

import CustomerLogin from './pages/customer/CustomerLogin';
import CustomerRegister from './pages/customer/CustomerRegister';
import ForgotPassword from './pages/auth/ForgotPassword';

import VendorLogin from './pages/vendor/VendorLogin';
import NewVendorRegister from './pages/vendor/newVendorRegister';
import VendorDashboard from './pages/vendor/VendorDashboard';
import VendorCheckIn from './pages/vendor/VendorCheckIn';
import ViewOrders from './pages/vendor/viewOrders';
import VendorProfile from './pages/vendor/VendorProfile';

import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

import ProtectedRoute from './components/common/ProtectedRoute';
import RedirectIfVendor from './components/common/RedirectIfVendor';

function App() {
  return (
    <Routes>
      {/* Landing Page: Keep Wrapper */}
      <Route 
        path="/" 
        element={
          <RedirectIfVendor allowCustomer={true}>
            <LandingPage />
          </RedirectIfVendor>
        } 
      />

      <Route path="/map" element={<MapPage />} />
      <Route path="/order/:vendorId" element={<OrderPage />} />
      
      {/* Protected Customer Routes */}
      <Route path="/payment" element={<ProtectedRoute><PaymentDetails /></ProtectedRoute>} />
      <Route path="/customer/profile" element={<ProtectedRoute><CustomerProfile /></ProtectedRoute>} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/payment-failed" element={<PaymentFailed />} />
      
      {/* --- CHANGE HERE: REMOVED WRAPPERS --- */}
      {/* We handle redirection INSIDE these components now */}
      <Route path="/login" element={<CustomerLogin />} />
      <Route path="/register" element={<CustomerRegister />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Vendor Auth: Keep Wrapper (Vendors shouldn't see these if logged in) */}
      <Route 
        path="/vendor/login" 
        element={
          <RedirectIfVendor allowCustomer={false}>
            <VendorLogin />
          </RedirectIfVendor>
        } 
      />
      <Route 
        path="/vendor/register" 
        element={
          <RedirectIfVendor allowCustomer={false}>
            <NewVendorRegister />
          </RedirectIfVendor>
        } 
      />
      
      {/* Protected Vendor Routes */}
      <Route path="/vendor/dashboard" element={<ProtectedRoute roles={['vendor']}><VendorDashboard /></ProtectedRoute>} />
      <Route path="/vendor/checkin" element={<ProtectedRoute roles={['vendor']}><VendorCheckIn /></ProtectedRoute>} />
      <Route path="/vendor/orders" element={<ProtectedRoute roles={['vendor']}><ViewOrders /></ProtectedRoute>} />
      <Route path="/vendor/profile" element={<ProtectedRoute roles={['vendor']}><VendorProfile /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
    </Routes>
  );
}

export default App;