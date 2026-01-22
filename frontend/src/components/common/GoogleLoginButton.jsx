import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api'; 

// Update props to accept 'from' location object
const GoogleLoginButton = ({ role = 'customer', from }) => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSuccess = async (credentialResponse) => {
    try {
      const res = await api.post('/auth/google-login', {
        token: credentialResponse.credential,
        role: role 
      });

      const { token, user } = res.data;
      login(token, user);
      
      // --- REDIRECT LOGIC ---
      if (user.role === 'vendor') {
        navigate('/vendor/dashboard');
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        // If 'from' exists (e.g. /payment), go there. Otherwise go Home.
        if (from) {
            navigate(from.pathname, { state: from.state, replace: true });
        } else {
            navigate('/', { replace: true });
        }
      }

    } catch (error) {
      console.error("Google Login Failed:", error.response?.data?.error || error.message);
      alert("Login failed. Please try again.");
    }
  };

  return (
    <div className="w-full flex justify-center my-4">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => console.log('Google Login Failed')}
        useOneTap
        theme="filled_black"
        shape="pill"
        width="350"
        text="continue_with_google"
      />
    </div>
  );
};

export default GoogleLoginButton;