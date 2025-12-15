import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import VendorLogin from './pages/vendor/VendorLogin'; // Ensure this path matches where you saved the file
import AdminLogin from './pages/admin/AdminLogin'; 
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route for the Admin Login */}
        <Route path="/admin/login" element={<AdminLogin />} />
        {/* Redirect root to login for viewing purposes */}
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
        {/* Route for the Vendor Login */}
        <Route path="/vendor/login" element={<VendorLogin />} />

        {/* Redirect root to login for viewing purposes */}
        <Route path="/" element={<Navigate to="/vendor/login" replace />} />

        {/* Placeholder for dashboard to prevent 404 on login success */}
        <Route path="/vendor/dashboard" element={<div><h1>Dashboard Access Granted</h1></div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;