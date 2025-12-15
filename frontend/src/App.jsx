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
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// CRITICAL: Leaflet Map CSS
// (The map will look broken/scrambled without this line)
import 'leaflet/dist/leaflet.css';

// Import your Registration Page
// Path based on your error log: src/pages/vendor/newVendorRegister.jsx
import VendorRegister from './pages/vendor/newVendorRegister';

// Placeholder components for links (so the app doesn't crash if you click 'Login')
const LoginPlaceholder = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-500">
    <p>Login Page Placeholder</p>
  </div>
);

const DashboardPlaceholder = () => (
  <div className="flex items-center justify-center h-screen bg-green-50 text-green-700">
    <p>Registration Successful! Welcome to the Dashboard.</p>
  </div>
);

const App = () => {
  return (
    <Router>
      <Routes>
        {/* 1. DEFAULT ROUTE (/)
           This forces the Registration Form to show up immediately 
           when you open the app (http://localhost:5173/).
        */}
        <Route path="/" element={<VendorRegister />} />

        {/* 2. SPECIFIC ROUTE 
           Keeps the URL structure clean if you navigate manually.
        */}
        <Route path="/vendor/register" element={<VendorRegister />} />

        {/* 3. SUPPORTING ROUTES
           These prevent the app from breaking when you click 
           "Login" or complete the registration form.
        */}
        <Route path="/vendor/login" element={<LoginPlaceholder />} />
        <Route path="/vendor/dashboard" element={<DashboardPlaceholder />} />
        
      </Routes>
    </Router>
  );
};

export default App;