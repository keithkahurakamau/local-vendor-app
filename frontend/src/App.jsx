import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// CRITICAL: Leaflet CSS (Required for Maps)
import 'leaflet/dist/leaflet.css';

// Import your Check-In Page
// Verify this path matches your file structure exactly
import VendorCheckIn from './pages/vendor/VendorCheckIn';

// Placeholder components so links don't break if you click them
const VendorLoginPlaceholder = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50">
    <h1 className="text-xl text-gray-500">Redirected to Login</h1>
  </div>
);

const App = () => {
  return (
    <Router>
      <Routes>
        {/* 1. DEFAULT ROUTE (/)
           Forces the Check-In page to load immediately.
        */}
        <Route path="/" element={<VendorCheckIn />} />

        {/* 2. DIRECT ROUTE 
           Keeps the URL valid if you manually type /vendor/checkin
        */}
        <Route path="/vendor/checkin" element={<VendorCheckIn />} />

        {/* 3. FALLBACK ROUTES
           Prevents 404 errors if you click "Logout" or other links in the nav
        */}
        <Route path="/vendor/login" element={<VendorLoginPlaceholder />} />
        
      </Routes>
    </Router>
  );
};

export default App;