import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || null);
  const [vendorToken, setVendorToken] = useState(localStorage.getItem('vendorToken') || null);
  const isAuthenticated = !!adminToken || !!vendorToken;

  useEffect(() => {
    if (adminToken) {
      localStorage.setItem('adminToken', adminToken);
    } else {
      localStorage.removeItem('adminToken');
    }
  }, [adminToken]);

  useEffect(() => {
    if (vendorToken) {
      localStorage.setItem('vendorToken', vendorToken);
    } else {
      localStorage.removeItem('vendorToken');
    }
  }, [vendorToken]);

  const adminLogin = (newToken) => {
    setAdminToken(newToken);
  };

  const vendorLogin = (newToken) => {
    setVendorToken(newToken);
  };

  const logout = () => {
    setAdminToken(null);
    setVendorToken(null);
  };

  return (
    <AuthContext.Provider value={{ adminToken, vendorToken, isAuthenticated, adminLogin, vendorLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
