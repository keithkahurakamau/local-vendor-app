import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Store, DollarSign, Users, LogOut, MapPin, Clock, Phone, FileText, Activity, Search, Hash } from 'lucide-react';
import api from '../../services/api';
import 'leaflet/dist/leaflet.css';

// --- CUSTOM ORANGE MARKER SETUP ---
const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('map');
  
  // Data State
  const [vendors, setVendors] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search States
  const [logSearch, setLogSearch] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');

  const [stats, setStats] = useState({
    totalVendors: 0,
    activeVendors: 0,
    totalTransactions: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    
    if (!token) {
        navigate('/admin/login'); 
        return;
    }

    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (vendors.length === 0) setLoading(true);
      
      const [vendorsResponse, logsResponse] = await Promise.all([
        api.get('/admin/vendors', config),
        api.get('/admin/logs', config)
      ]);

      const vendorsData = vendorsResponse.data.vendors || [];
      const logsData = logsResponse.data.logs || [];

      setVendors(vendorsData);
      setLogs(logsData);

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

  // --- FILTER LOGIC ---
  
  // 1. Filter Logs
  const filteredLogs = logs.filter(log => {
    if (!logSearch) return true;
    const query = logSearch.toLowerCase();
    return (
      log.order_id?.toLowerCase().includes(query) ||
      log.vendor_name?.toLowerCase().includes(query) ||
      log.receipt?.toLowerCase().includes(query) ||
      log.status?.toLowerCase().includes(query) ||
      log.amount?.toString().includes(query)
    );
  });

  // 2. Filter Map Vendors
  const filteredVendors = vendors.filter(vendor => {
    if (!vendorSearch) return true;
    const query = vendorSearch.toLowerCase();
    return (
      vendor.name?.toLowerCase().includes(query) ||
      vendor.vendor_id?.toString().includes(query) ||
      vendor.id?.toString().includes(query) ||
      vendor.phone_number?.includes(query)
    );
  });

  if (loading && vendors.length === 0) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

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
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h1>
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

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg shadow-orange-100/50 border border-orange-100 p-6 flex items-center">
            <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100 shadow-sm">
              <Users className="h-8 w-8 text-teal-600" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Active Vendors</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1">{stats.activeVendors}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg shadow-orange-100/50 border border-orange-100 p-6 flex items-center">
            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 shadow-sm">
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Transactions</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1">{stats.totalTransactions}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg shadow-orange-100/50 border border-orange-100 p-6 flex items-center">
            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 shadow-sm">
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Revenue</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1">{formatCurrency(stats.totalRevenue)}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-orange-100">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('map')}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'map'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-orange-500 hover:border-orange-200'
                }`}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Live Vendor Map
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'logs'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-orange-500 hover:border-orange-200'
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
          <div className="bg-white shadow-xl shadow-orange-100/50 rounded-2xl overflow-hidden border border-orange-100">
            
            {/* Map Header with Search */}
            <div className="px-6 py-4 border-b border-orange-100 flex flex-col sm:flex-row justify-between items-center bg-orange-50/30 gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Active Vendor Locations</h3>
                <p className="text-sm text-gray-500">Real-time view of vendors currently open for business</p>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-orange-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search vendor, ID, or phone..."
                        className="block w-full pl-10 pr-3 py-2 border border-orange-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors"
                        value={vendorSearch}
                        onChange={(e) => setVendorSearch(e.target.value)}
                    />
                </div>
                <span className="hidden sm:flex bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full border border-green-200 animate-pulse items-center gap-1 whitespace-nowrap">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span> Live
                </span>
              </div>
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
                
                {filteredVendors.map((vendor) => (
                  <Marker
                    key={vendor.id}
                    position={[vendor.latitude, vendor.longitude]}
                    icon={orangeIcon}
                  >
                    {/* UPDATED POPUP */}
                    <Popup minWidth={260} maxWidth={260} className="custom-popup">
                      <div className="p-1 font-sans">
                        <div className="flex items-start justify-between mb-3 pb-2 border-b border-gray-100">
                            <div>
                                <h4 className="font-bold text-gray-900 text-base line-clamp-1">{vendor.name}</h4>
                                <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono mt-0.5">
                                    <Hash size={10} /> ID: {vendor.vendor_id || vendor.id}
                                </div>
                            </div>
                            <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-green-200 mt-1">
                                OPEN
                            </span>
                        </div>
                        
                        <div className="space-y-2.5">
                            <div className="flex items-start gap-2 text-sm text-gray-700">
                                <MapPin className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" /> 
                                <span className="leading-tight text-xs font-medium">{vendor.address || "Location unavailable"}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                <Phone className="h-4 w-4 text-teal-600 flex-shrink-0" />
                                <span className="font-mono text-xs font-medium bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                    {vendor.phone_number}
                                </span>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-gray-500 bg-orange-50/50 p-2 rounded-lg mt-2 border border-orange-100">
                                <div className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-orange-400" />
                                    <span>Active Time:</span>
                                </div>
                                <span className="font-bold text-orange-700">{vendor.active_for_mins} mins</span>
                            </div>
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
          <div className="bg-white shadow-xl shadow-orange-100/50 rounded-2xl overflow-hidden border border-orange-100">
            
            {/* Logs Header with Search */}
            <div className="px-6 py-4 border-b border-orange-100 bg-orange-50/30 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Transaction Logs</h3>
                <p className="text-sm text-gray-500">History of all payment attempts</p>
              </div>
              
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-orange-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search logs..."
                  className="block w-full pl-10 pr-3 py-2 border border-orange-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-orange-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Receipt</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-orange-50">
                  {filteredLogs.map((log, index) => (
                    <tr key={`${log.id || 'log'}-${index}`} className="hover:bg-orange-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString('en-KE')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {log.order_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {log.receipt || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {log.vendor_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                        {formatCurrency(log.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                          log.status === 'Successful' 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLogs.length === 0 && (
                <div className="text-center py-12">
                  <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText className="text-gray-300 h-8 w-8" />
                  </div>
                  <p className="text-gray-500 font-medium">No transactions found</p>
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