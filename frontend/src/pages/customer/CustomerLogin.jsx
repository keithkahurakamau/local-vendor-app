import React, { useState, useEffect } from 'react'; // Added useEffect
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import GoogleLoginButton from '../../components/common/GoogleLoginButton';

const CustomerLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth(); // Get user
  
  const from = location.state?.from;

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- REDIRECT LOGIC ---
  useEffect(() => {
    if (user) {
        if (user.role === 'vendor') {
            navigate('/vendor/dashboard', { replace: true });
        } else {
            if (from) {
                navigate(from.pathname, { state: from.state, replace: true });
            } else {
                navigate('/', { replace: true });
            }
        }
    }
  }, [user, navigate, from]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { ...formData, role: 'customer' });
      if (res.data.token) {
        // Just Login. The useEffect above handles the redirect
        login(res.data.token, res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password');
      setLoading(false);
    }
  };

  // ... (Rest of the UI remains the same as previous steps) ...
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50 px-4">
      {/* ... Same JSX as before ... */}
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-orange-100/50 p-8 border border-orange-100 relative">
        <Link to="/" className="absolute top-6 left-6 text-gray-400 hover:text-orange-600 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="text-center mb-6 mt-4">
          <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-500 text-sm mt-1">
             {from ? "Please login to complete your order." : "Hungry? Let's get you signed in."}
          </p>
        </div>
        <GoogleLoginButton role="customer" from={from} />
        <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium tracking-wide">OR LOGIN WITH EMAIL</span>
            <div className="flex-grow border-t border-gray-100"></div>
        </div>
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-2 justify-center border border-red-100 animate-fadeIn">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <input name="email" type="email" required placeholder="Email Address" className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" onChange={handleChange} />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <input name="password" type="password" required placeholder="Password" className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" onChange={handleChange} />
          </div>
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-orange-600 font-bold hover:underline">Forgot Password?</Link>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-gray-200 transition-all active:scale-95 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (from ? 'Login & Continue' : 'Sign In')}
          </button>
        </form>
        <p className="mt-6 text-center text-gray-500 text-sm">
          New here? <Link to="/register" state={{ from }} className="text-orange-600 font-bold hover:underline">Create account</Link>
        </p>
      </div>
    </div>
  );
};

export default CustomerLogin;