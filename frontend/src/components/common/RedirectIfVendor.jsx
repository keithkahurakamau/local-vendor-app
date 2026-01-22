import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Wraps public pages (Landing, Login, Register).
 * If a VENDOR is logged in, they are redirected to their Dashboard.
 * If a CUSTOMER is logged in, they can still see the Landing Page (to order food),
 * but will be redirected away from Login/Register pages.
 */
const RedirectIfVendor = ({ children, allowCustomer = false }) => {
  const { user } = useAuth();

  if (user?.role === 'vendor') {
    // 1. Vendor is logged in -> Force them to Dashboard
    return <Navigate to="/vendor/dashboard" replace />;
  }

  if (user?.role === 'customer' && !allowCustomer) {
    // 2. Customer is logged in, but tried to access Login/Register -> Send to Home
    return <Navigate to="/" replace />;
  }

  // 3. Not logged in (or allowed customer) -> Show the page
  return children;
};

export default RedirectIfVendor;