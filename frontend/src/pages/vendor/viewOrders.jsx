import React, { useState, useEffect } from 'react';
import { ShoppingBag, Clock, Search, AlertCircle, Loader2 } from 'lucide-react';
import { vendorAPI } from '../../services/api';

const ViewOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // FIX: Initialize with empty string to prevent React warning
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // FIX: Use the service. api.js already handles the base URL.
      const response = await vendorAPI.getOrders();
      if (response.data && response.data.success) {
        setOrders(response.data.orders);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      // Don't show error if it's just empty
      if (err.response?.status !== 404) {
          setError('Failed to load orders.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => 
    (order.id?.toString() || '').includes(searchTerm) ||
    (order.customer_phone || '').includes(searchTerm) ||
    (order.mpesa_receipt_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'failed': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="text-orange-600" /> Incoming Orders
            </h1>
            <p className="text-gray-500 text-sm mt-1">Manage and track your customer payments</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search Order ID or Phone..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 text-orange-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex items-center gap-3 text-red-700">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
            <div className="bg-gray-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No Orders Yet</h3>
            <p className="text-gray-500">Orders will appear here once customers make payments.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-orange-50 p-3 rounded-xl hidden sm:block">
                      <ShoppingBag className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900">Order #{order.id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(order.status)} uppercase font-bold`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(order.created_at).toLocaleString()}</span>
                        <span className="flex items-center gap-1 font-mono">{order.customer_phone}</span>
                        {order.mpesa_receipt_number && (
                          <span className="bg-gray-100 px-2 rounded text-xs border border-gray-200 font-mono">{order.mpesa_receipt_number}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">KES {order.amount}</div>
                    <div className="text-xs text-gray-400">Paid via M-Pesa</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewOrders;