import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LocationProvider } from './context/LocationContext';
import { AuthProvider } from './context/AuthContext';
// 1. Import the CartProvider
import { CartProvider } from './context/CartContext';

// --- PASTE YOUR REAL ID HERE ---
const GOOGLE_CLIENT_ID = "463450229714-1getjqvc9ibp61orp0t0d2rp0hcnn5lc.apps.googleusercontent.com"; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <LocationProvider>
            {/* 2. Wrap App with CartProvider */}
            <CartProvider>
              <App />
            </CartProvider>
          </LocationProvider>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);