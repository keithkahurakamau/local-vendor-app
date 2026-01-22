import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
  const { user, token } = useAuth();
  const location = useLocation();

  // 1. Check if user is logged in
  if (!token || !user) {
    // Redirect to login, but save the current location (e.g., /payment)
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Optional: Check for specific roles (e.g. only 'vendor' can see dashboard)
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;