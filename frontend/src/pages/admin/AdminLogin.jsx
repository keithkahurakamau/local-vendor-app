import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// ADDED: Eye, EyeOff
import { Shield, Lock, Loader2, AlertTriangle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // ADDED: Password toggle state
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Correct endpoint as defined in backend blueprint
      const response = await api.post('/admin/login', formData);
      
      // Store token with a specific key to distinguish from vendor/user
      localStorage.setItem('admin_token', response.data.token);
      
      navigate('/admin/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Access Denied: Invalid credentials or insufficient permissions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 relative">
      
      {/* Back Button */}
      <div className="absolute top-6 left-6">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
           <ArrowLeft className="h-4 w-4" /> Back to Home
        </button>
      </div>

      <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            <Shield className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Admin Portal</h2>
          <p className="mt-2 text-slate-400 text-sm">Restricted Access. Authorized personnel only.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-400 animate-fadeIn">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">System Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="admin@hyperlocal.com"
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder-slate-600"
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Secure Key</label>
            <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-500" />
                <input
                  name="password"
                  // CHANGE: Dynamic type
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg pl-10 pr-12 py-3 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder-slate-600"
                  onChange={handleChange}
                />
                {/* CHANGE: Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 transform active:scale-95 shadow-lg shadow-red-900/20"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Authenticate System'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;