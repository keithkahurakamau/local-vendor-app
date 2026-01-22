import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { vendorAPI } from '../../services/api'; // Ensure you have an update endpoint or use api.put
import { Store, Phone, User, Lock, Save, Star, Hash } from 'lucide-react';
import api from '../../services/api';

const VendorProfile = () => {
  const { user, login } = useAuth(); // We need login to update the local user state after saving
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    business_name: user?.business_name || '',
    username: user?.username || '',
    phone_number: user?.phone_number || '',
    password: '' // Only if changing
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Assuming PUT /api/vendor/profile exists from earlier steps
      const res = await api.put('/vendor/profile', formData);
      
      // Update local auth state with new details
      // Note: Backend should return the updated user object
      // For now we assume res.data.user
      if(res.data.success) {
          setMessage({ type: 'success', text: 'Profile updated successfully!' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-12">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gray-900 text-white p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full opacity-10 blur-3xl -mr-16 -mt-16"></div>
            <h1 className="text-3xl font-bold relative z-10">Vendor Settings</h1>
            <p className="text-gray-400 relative z-10">Manage your business details</p>
        </div>

        <div className="p-8">
            {/* Read Only Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <div className="flex items-center gap-2 text-orange-800 font-bold mb-1">
                        <Hash size={16} /> Vendor ID
                    </div>
                    <p className="text-2xl font-black text-gray-900">{user?.id}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                    <div className="flex items-center gap-2 text-yellow-700 font-bold mb-1">
                        <Star size={16} /> Rating
                    </div>
                    <p className="text-2xl font-black text-gray-900">4.8 <span className="text-sm text-gray-400 font-normal">/ 5.0</span></p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {message.text && (
                    <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Business Name</label>
                        <div className="relative">
                            <Store className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                name="business_name"
                                value={formData.business_name}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" 
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Owner Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" 
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                name="phone_number"
                                value={formData.phone_number}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" 
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Change Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                name="password"
                                type="password"
                                placeholder="Leave empty to keep current"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" 
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <button type="submit" disabled={loading} className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg flex items-center gap-2">
                        <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default VendorProfile;