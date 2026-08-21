import React, { useEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

/**
 * Google sign-in, sized to whatever contains it.
 *
 * The Google button renders inside an iframe with a hard pixel width, so a
 * hardcoded value (it used to be 350) either overflowed a narrow phone or left a
 * gap beside a full-width form. Measuring the wrapper keeps it flush with the
 * fields above and below it on every screen.
 */
const GoogleLoginButton = ({ role = 'customer', from, oneTap = false }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(320);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      // Google rejects widths above 400 and renders unusably small below 200.
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setWidth(Math.min(Math.max(w, 200), 400));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleSuccess = async (credentialResponse) => {
    try {
      const res = await api.post('/auth/google-login', {
        token: credentialResponse.credential,
        role,
      });

      const { token, user } = res.data;
      login(token, user);

      if (user.role === 'vendor') {
        navigate('/vendor/dashboard');
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (from) {
        navigate(from.pathname, { state: from.state, replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Google Login Failed:', error.response?.data?.error || error.message);
      alert('Login failed. Please try again.');
    }
  };

  return (
    <div ref={wrapRef} className="flex w-full justify-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => console.error('Google Login Failed')}
        useOneTap={oneTap}
        theme="outline"
        shape="pill"
        width={width}
        text="continue_with"
        logo_alignment="center"
      />
    </div>
  );
};

export default GoogleLoginButton;
