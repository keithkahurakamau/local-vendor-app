
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { Search, LogOut, Filter, Calendar, Package, User } from "lucide-react";

const sampleOrders = [
  {
    id: "ORD-001",
    customer: "John Doe",
    item: "Fresh Oranges",
    quantity: 10,
    status: "New Order",
    date: "2025-01-10",
  },
  {
    id: "ORD-002",
    customer: "Mary Wanjiku",
    item: "Tomatoes",
    quantity: 5,
    status: "On Progress",
    date: "2025-01-09",
  },
  {
    id: "ORD-003",
    customer: "Peter Kimani",
    item: "Bananas",
    quantity: 12,
    status: "Delivered",
    date: "2025-01-08",
  },
  {
    id: "ORD-004",
    customer: "Sarah Johnson",
    item: "Avocados",
    quantity: 8,
    status: "On Progress",
    date: "2025-01-10",
  },
  {
    id: "ORD-005",
    customer: "David Ochieng",
    item: "Mangoes",
    quantity: 15,
    status: "New Order",
    date: "2025-01-11",
  },
];


export default function OrdersView() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");

  const filteredOrders = sampleOrders
    .filter(order =>
      statusFilter === "All" ? true : order.status === statusFilter
    )
    .filter(order =>
      order.customer.toLowerCase().includes(search.toLowerCase()) ||
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      order.item.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "date") return new Date(b.date) - new Date(a.date);
      if (sortBy === "customer") return a.customer.localeCompare(b.customer);
      return 0;
    });

  const getStatusConfig = (status) => {
    const configs = {
      "Delivered": {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        dot: "bg-emerald-500"
      },
      "On Progress": {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        dot: "bg-amber-500"
      },
      "New Order": {
        bg: "bg-orange-50",
        text: "text-orange-700",
        border: "border-orange-200",
        dot: "bg-orange-500"
      }
    };
    return configs[status] || configs["New Order"];
  };

  const stats = [
    { label: "Total Orders", value: sampleOrders.length, icon: Package, color: "text-blue-600" },
    { label: "New", value: sampleOrders.filter(o => o.status === "New Order").length, icon: Calendar, color: "text-orange-600" },
    { label: "In Progress", value: sampleOrders.filter(o => o.status === "On Progress").length, icon: Filter, color: "text-amber-600" },
    { label: "Delivered", value: sampleOrders.filter(o => o.status === "Delivered").length, icon: Package, color: "text-emerald-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-orange-800 to-slate-900 bg-clip-text text-transparent mb-2">
                Order Management
              </h1>
              <p className="text-slate-600 text-sm">Track and manage all your orders in one place</p>
            </div>
            

            <div className="flex gap-3">
              <button 
                onClick={() => navigate('/vendor/checkin')} 
                className="px-5 py-2.5 rounded-xl border-2 border-orange-500 bg-white text-orange-600 font-medium hover:bg-orange-50 hover:shadow-lg hover:shadow-orange-100 transition-all duration-200 flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Check-in Page
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md hover:border-orange-200 transition-all duration-200"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-slate-50 ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by order ID, customer, or item..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all duration-200 text-slate-700"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all duration-200 cursor-pointer text-slate-700 font-medium bg-white"
            >
              <option value="date">📅 Sort by Date</option>
              <option value="customer">👤 Sort by Customer</option>
            </select>
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
            {["All", "New Order", "On Progress", "Delivered"].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-5 py-2 rounded-full font-medium transition-all duration-200 ${
                  statusFilter === status
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-200 scale-105"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:scale-105"
                }`}
              >
                {status}
                {status !== "All" && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    statusFilter === status ? "bg-white/20" : "bg-slate-200"
                  }`}>
                    {sampleOrders.filter(o => o.status === status).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-orange-50/50 border-b-2 border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order, idx) => {
                  const statusConfig = getStatusConfig(order.status);
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50 transition-colors duration-150 group"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-semibold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg group-hover:bg-orange-100 group-hover:text-orange-700 transition-colors">
                          {order.id}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold shadow-md">
                            {order.customer.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{order.customer}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700">{order.item}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-slate-900">{order.quantity}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} animate-pulse`}></span>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                        {new Date(order.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                <Package className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">No orders found</p>
              <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="mt-6 text-center text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filteredOrders.length}</span> of{" "}
          <span className="font-semibold text-slate-700">{sampleOrders.length}</span> orders
        </div>
      </div>
    </div>
  );
}