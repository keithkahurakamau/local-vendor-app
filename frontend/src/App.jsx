import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import VendorLogin from './pages/vendor/VendorLogin';
import AdminLogin from './pages/admin/AdminLogin';
//import AdminDashboard from './pages/admin/AdminDashboard';
//import VendorCheckIn from './pages/vendor/VendorCheckIn';
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Route for the Admin Login */}
          <Route path="/admin/login" element={<AdminLogin />} />
         
          {/* Route for the Vendor Login */}
          <Route path="/vendor/login" element={<VendorLogin />} />
      
          {/* Redirect root to admin login */}
          <Route path="/" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;