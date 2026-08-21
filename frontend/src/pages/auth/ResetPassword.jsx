import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, Loader2, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../../services/api';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  // 'checking' -> link is being validated, 'ready' -> show form,
  // 'invalid' -> token bad/expired, 'done' -> password changed
  const [stage, setStage] = useState('checking');
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Validate the link before rendering the form, so an expired link says so
  // up front instead of after the user has typed a new password.
  useEffect(() => {
    let cancelled = false;

    authAPI
      .verifyResetToken(token)
      .then((res) => {
        if (cancelled) return;
        setEmail(res.data.email || '');
        setStage('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.error || 'This reset link is invalid or has expired.');
        setStage('invalid');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      setStage('done');
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset your password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-orange-100/50 p-8 border border-orange-100 relative">

        <Link to="/login" className="absolute top-6 left-6 text-gray-400 hover:text-orange-600 transition-colors">
          <ArrowLeft size={20} />
        </Link>

        {stage === 'checking' && (
          <div className="text-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-orange-500 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Checking your reset link…</p>
          </div>
        )}

        {stage === 'invalid' && (
          <div className="text-center py-8">
            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Link not valid</h2>
            <p className="text-gray-500 mt-2 mb-8 text-sm">{error}</p>
            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-gray-200 transition-all active:scale-95"
            >
              Request a new link
            </button>
          </div>
        )}

        {stage === 'ready' && (
          <>
            <div className="text-center mb-8 mt-4">
              <div className="bg-orange-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-orange-600 shadow-inner">
                <Lock size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Set a new password</h2>
              <p className="text-gray-500 mt-2 text-sm">
                {email ? <>Resetting the password for <strong>{email}</strong></> : 'Choose a new password for your account.'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 text-center border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="New password"
                  className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-orange-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Confirm new password"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>

              <p className="text-xs text-gray-400">Must be at least 8 characters.</p>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-gray-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        {stage === 'done' && (
          <div className="text-center py-8">
            <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 animate-bounce">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Password updated</h2>
            <p className="text-gray-500 mt-2 mb-8 text-sm">Taking you to the login page…</p>
            <Link to="/login" className="text-orange-600 font-bold hover:text-orange-700 text-sm transition-colors">
              Go to login now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
