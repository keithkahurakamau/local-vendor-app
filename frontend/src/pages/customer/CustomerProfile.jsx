import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Wallet, Clock, CreditCard, Settings, Smartphone, LogOut } from 'lucide-react';

const CustomerProfile = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('activity'); // 'activity', 'wallet', 'settings'

  // Mock Wallet Data (Since we haven't added wallet columns to DB yet)
  const walletBalance = 1250.00;

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 flex flex-col md:flex-row items-center gap-6">
          <div className="h-24 w-24 rounded-full bg-orange-100 flex items-center justify-center text-3xl font-bold text-orange-600 border-4 border-white shadow-lg overflow-hidden">
             {user?.storefront_image_url ? (
                 <img src={user.storefront_image_url} alt="Profile" className="w-full h-full object-cover" />
             ) : (
                 user?.name?.charAt(0) || user?.username?.charAt(0) || "U"
             )}
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{user?.name || user?.username || 'Valued Customer'}</h1>
            <p className="text-gray-500">{user?.email}</p>
            <div className="mt-2 flex gap-2 justify-center md:justify-start">
                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">Verified Account</span>
                {user?.google_id && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">Google Linked</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Sidebar Navigation */}
          <div className="md:col-span-1 space-y-2">
            <button 
                onClick={() => setActiveTab('activity')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'activity' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-600 hover:bg-orange-50'}`}
            >
                <Clock size={18} /> Activity
            </button>
            <button 
                onClick={() => setActiveTab('wallet')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'wallet' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-600 hover:bg-orange-50'}`}
            >
                <Wallet size={18} /> My Wallet
            </button>
            <button 
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'settings' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-600 hover:bg-orange-50'}`}
            >
                <Settings size={18} /> Settings
            </button>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-3">
            
            {/* 1. ACTIVITY TAB */}
            {activeTab === 'activity' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
                    {/* Placeholder for Order History */}
                    <div className="space-y-4">
                        <div className="border border-gray-100 rounded-xl p-4 flex justify-between items-center hover:bg-gray-50">
                            <div className="flex gap-4">
                                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">🍔</div>
                                <div>
                                    <p className="font-bold text-gray-900">Keith's Kitchen</p>
                                    <p className="text-sm text-gray-500">2 Items • Delivered</p>
                                </div>
                            </div>
                            <span className="font-bold text-gray-900">KES 450</span>
                        </div>
                        {/* More items would be mapped here */}
                        <div className="text-center py-8 text-gray-400 text-sm">
                            No more recent activity.
                        </div>
                    </div>
                </div>
            )}

            {/* 2. WALLET TAB */}
            {activeTab === 'wallet' && (
                <div className="space-y-6">
                    {/* Balance Card */}
                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-gray-400 text-sm font-medium mb-1">Total Balance</p>
                            <h2 className="text-4xl font-bold tracking-tight">KES {walletBalance.toLocaleString()}</h2>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-bold text-gray-900 mb-4">Top Up Wallet</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <button className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all gap-2 group">
                                <Smartphone className="text-green-600 group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-sm text-gray-700">M-Pesa</span>
                            </button>
                            <button className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all gap-2 group">
                                <CreditCard className="text-blue-600 group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-sm text-gray-700">Google Pay</span>
                            </button>
                            <button className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all gap-2 group">
                                <Wallet className="text-indigo-600 group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-sm text-gray-700">PayPal</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. SETTINGS TAB */}
            {activeTab === 'settings' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold mb-6">Edit Profile</h2>
                    <form className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input type="text" defaultValue={user?.username} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input type="tel" defaultValue={user?.phone_number} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                            </div>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Email (Read Only)</label>
                             <input type="email" defaultValue={user?.email} disabled className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500" />
                        </div>
                        <div className="pt-4">
                            <button className="bg-gray-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors">
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;