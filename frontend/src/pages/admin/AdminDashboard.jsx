import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Store, DollarSign, Users, TrendingUp, LogOut, MapPin, Clock, Phone, FileText, ShoppingBag } from 'lucide-react';
import api from '../../services/api';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet default marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('map');
  const [vendors, setVendors] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVendors: 0,
    activeVendors: 0,
    totalTransactions: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 15s (Faster updates)
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    // 1. Check for token (Check both keys to be safe)
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    
    if (!token) {
        navigate('/admin/login'); 
        return;
    }

    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      // Only set loading on initial load, not background refreshes
      if (vendors.length === 0) setLoading(true);
      
      const [vendorsResponse, logsResponse] = await Promise.all([
        api.get('/admin/vendors', config),
        api.get('/admin/logs', config)
      ]);

      const vendorsData = vendorsResponse.data.vendors || [];
      const logsData = logsResponse.data.logs || [];

      setVendors(vendorsData);
      setLogs(logsData);

      // Calculate stats based on "Successful" status
      const totalTransactions = logsData.length;
      const totalRevenue = logsData
        .filter(log => log.status === 'Successful') 
        .reduce((sum, log) => sum + log.amount, 0);

      setStats({
        totalVendors: vendorsData.length, 
        activeVendors: vendorsData.length,
        totalTransactions,
        totalRevenue
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
          handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('user');
    navigate('/admin/login');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  if (loading && vendors.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center gap-2">
                <div className="bg-orange-600 p-2 rounded-lg">
                  <Store className="text-white text-lg" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Vendors</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeVendors}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('map')}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'map'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Live Vendor Map
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'logs'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-4 h-4 mr-2" />
                Transaction Logs
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content: MAP */}
        {activeTab === 'map' && (
          <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Active Vendor Locations</h3>
                <p className="text-sm text-gray-500">Real-time view of vendors currently open for business</p>
              </div>
              <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-0.5 rounded border border-green-200 animate-pulse">
                Live Data
              </span>
            </div>
            {/* Map Container */}
            <div className="h-[600px] w-full relative z-0">
              <MapContainer
                center={[-1.2921, 36.8219]} 
                zoom={12}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {vendors.map((vendor) => (
                  <Marker
                    key={vendor.id}
                    position={[vendor.latitude, vendor.longitude]}
                  >
                    <Popup>
                      <div className="p-1 min-w-[200px]">
                        <h4 className="font-bold text-gray-900 text-base">{vendor.name}</h4>
                        <div className="mt-2 space-y-1">
                            <p className="text-xs text-gray-600 flex items-center">
                                <MapPin className="h-3 w-3 mr-1 text-orange-500" /> 
                                {vendor.address}
                            </p>
                            <p className="text-xs text-gray-600 flex items-center">
                                <Phone className="h-3 w-3 mr-1 text-blue-500" />
                                {vendor.phone_number}
                            </p>
                            <p className="text-xs text-gray-500 mt-2 border-t pt-1">
                                <Clock className="inline h-3 w-3 mr-1" />
                                Closes in: <span className="font-bold">{vendor.active_for_mins} mins</span>
                            </p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        )}

        {/* Tab Content: LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Transaction Logs</h3>
              <p className="text-sm text-gray-500">History of all payment attempts</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor Name</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log, index) => (
                    // FIX: Unique key using ID and Index to prevent React Warning
                    <tr key={`${log.id || 'log'}-${index}`} className="hover:bg-gray-50">
                      
                      {/* 1. Timestamp */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.timestamp).toLocaleString('en-KE')}
                      </td>

                      {/* 2. Order ID (NEW) */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium font-mono">
                        <div className="flex items-center gap-1">
                            <ShoppingBag size={14} />
                            {log.order_id}
                        </div>
                      </td>

                      {/* 3. Receipt */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {log.receipt}
                      </td>

                      {/* 4. Vendor ID */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        #{log.vendor_id}
                      </td>

                      {/* 5. Vendor Name */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {log.vendor_name}
                      </td>

                      {/* 6. Amount */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                        {formatCurrency(log.amount)}
                      </td>

                      {/* 7. Status */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          log.status === 'Successful' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No transactions found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;