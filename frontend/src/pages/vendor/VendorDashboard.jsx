import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MapPin, Package, LogOut, TrendingUp, DollarSign, Clock, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const VendorDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    // 1. Clear the User State
    logout();
    
    // 2. Force navigation to Landing Page
    // Using window.location.href ensures a clean state reset and bypasses 
    // any ProtectedRoute race conditions that might redirect to login.
    window.location.href = '/'; 
  };

  const dashboardCards = [
    {
      title: 'Check In',
      description: 'Update your location and menu items',
      icon: MapPin,
      action: () => navigate('/vendor/checkin'),
      color: 'bg-orange-500', 
      bgColor: 'bg-orange-50'
    },
    {
      title: 'View Orders',
      description: 'See your completed transactions',
      icon: Package,
      action: () => navigate('/vendor/orders'),
      color: 'bg-teal-600',
      bgColor: 'bg-teal-50'
    },
    {
      title: 'Settings',
      description: 'Edit profile, image, and password',
      icon: Settings,
      action: () => navigate('/vendor/profile'),
      color: 'bg-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      
      {/* Header */}
      <nav className="bg-white/90 backdrop-blur-md shadow-sm border-b border-orange-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center gap-2">
                <div className="bg-orange-600 p-2 rounded-lg shadow-sm">
                  <Store className="text-white text-lg" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Vendor Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-white border border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Welcome Section */}
        <div className="bg-white rounded-2xl shadow-xl shadow-orange-100/50 border border-orange-100 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-orange-50 p-4 rounded-full border border-orange-100">
              <Store className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Welcome back!</h2>
              <p className="text-gray-500 font-medium">Manage your hyper-local business from here</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dashboardCards.map((card, index) => (
            <div
              key={index}
              onClick={card.action}
              className="bg-white rounded-2xl shadow-lg shadow-gray-100 hover:shadow-xl hover:shadow-orange-100/50 hover:border-orange-200 border border-transparent transition-all cursor-pointer p-6 group"
            >
              <div className="flex items-center gap-4">
                <div className={`${card.color} p-4 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{card.title}</h3>
                  <p className="text-gray-500 text-sm font-medium">{card.description}</p>
                </div>
                <div className="text-gray-300 group-hover:text-orange-400 group-hover:translate-x-1 transition-all">
                  →
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Overview */}
        <div className="bg-white rounded-2xl shadow-xl shadow-orange-100/20 border border-orange-100 p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="text-orange-500" /> Quick Stats
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-orange-100">
            
            <div className="text-center pt-4 md:pt-0">
              <div className="bg-blue-50 p-3 rounded-2xl w-14 h-14 mx-auto mb-3 flex items-center justify-center border border-blue-100">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">Active</p>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mt-1">Status</p>
            </div>
            
            <div className="text-center pt-4 md:pt-0">
              <div className="bg-green-50 p-3 rounded-2xl w-14 h-14 mx-auto mb-3 flex items-center justify-center border border-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">KES 0</p>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mt-1">Today's Revenue</p>
            </div>
            
            <div className="text-center pt-4 md:pt-0">
              <div className="bg-purple-50 p-3 rounded-2xl w-14 h-14 mx-auto mb-3 flex items-center justify-center border border-purple-100">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">5km</p>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mt-1">Service Radius</p>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;