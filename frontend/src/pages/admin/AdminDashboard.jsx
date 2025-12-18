import React from 'react';
import { MapPin, LogOut, Store, ReceiptText, Activity, TrendingUp, Users, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Reusable Components


const DashboardCard = ({ title, subtitle, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    className="bg-white p-6 rounded-xl shadow-sm hover:shadow-xl border border-gray-100 flex items-center justify-between text-left transition-all duration-300 hover:-translate-y-1 group overflow-hidden relative"
  >
    {/* Subtle gradient overlay on hover */}
    <div className="absolute inset-0 bg-gradient-to-r from-orange-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    
    <div className="relative z-10">
      <h3 className="font-bold text-gray-800 text-lg mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
    <div className="relative z-10 bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-xl shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
      <Icon className="text-white" size={24} />
    </div>
  </button>
);

const SectionCard = ({ title, icon: Icon, children }) => (
  <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
    <div className="flex items-center gap-3 mb-5">
      <div className="bg-gradient-to-br from-orange-100 to-orange-50 p-2.5 rounded-lg">
        <Icon className="text-orange-600" size={20} />
      </div>
      <h3 className="font-semibold text-gray-800 text-base">{title}</h3>
    </div>
    {children}
  </section>
);

const ActivityItem = ({ text, time }) => (
  <div className="flex justify-between items-center text-sm p-4 bg-gradient-to-r from-gray-50 via-orange-50/30 to-gray-50 rounded-lg hover:from-orange-50 hover:via-orange-100/50 hover:to-orange-50 transition-all duration-300 border border-gray-100 group">
    <span className="text-gray-800 font-medium group-hover:text-orange-700 transition-colors">{text}</span>
    <span className="text-gray-500 text-xs bg-white px-3 py-1.5 rounded-full border border-gray-200 group-hover:border-orange-200 transition-colors">{time}</span>
  </div>
);

const StatCard = ({ label, value, icon: Icon, trend, trendUp = true }) => (
  <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-white relative overflow-hidden group">
    {/* Decorative circles */}
    <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
    
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <span className="text-orange-100 text-sm font-medium uppercase tracking-wide">{label}</span>
        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <div className="text-3xl font-bold mb-2">{value}</div>
      {trend && (
        <div className={`text-xs flex items-center gap-1 ${trendUp ? 'text-orange-100' : 'text-orange-200'}`}>
          <TrendingUp size={14} className={trendUp ? '' : 'rotate-180'} />
          {trend}
        </div>
      )}
    </div>
  </div>
);

// -----------------------------
// Main Dashboard
// -----------------------------

const AdminDashboard = () => {
  const navigate = useNavigate();

  const activities = [
    { text: 'Mama Otis Smokies checked in', time: '10 mins ago' },
    { text: 'Downtown Fries updated menu', time: '30 mins ago' },
    { text: 'City Bites checked out', time: '1 hour ago' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/20 to-gray-100 p-6">

      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 bg-clip-text text-transparent mb-1">
            Admin Dashboard
          </h1>
          <p className="text-gray-500 text-sm">Welcome back! Here's your business overview.</p>
        </div>
        <button
          aria-label="Logout"
          onClick={() => navigate('/')}
          className="border-2 border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow"
        >
          <LogOut size={18} /> Logout
        </button>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <StatCard 
          label="Active Vendors" 
          value="12" 
          icon={Users}
          trend="+3 from yesterday" 
          trendUp={true}
        />
        <StatCard 
          label="Today's Revenue" 
          value="KES 24,500" 
          icon={DollarSign}
          trend="+18% vs last week" 
          trendUp={true}
        />
        <StatCard 
          label="Total Orders" 
          value="47" 
          icon={ReceiptText}
          trend="8 pending delivery" 
          trendUp={true}
        />
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <DashboardCard
          title="Live Coverage"
          subtitle="View active vendor map"
          icon={MapPin}
          onClick={() => navigate('/admin/map')}
        />
        <DashboardCard
          title="View Vendors"
          subtitle="Manage vendor accounts"
          icon={Store}
          onClick={() => navigate('/admin/vendors')}
        />
        <DashboardCard
          title="Transaction Log"
          subtitle="View sales history"
          icon={ReceiptText}
          onClick={() => navigate('/admin/transactions')}
        />
      </div>

      {/* Overview Section Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-8 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full shadow-sm"></div>
        <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <SectionCard title="Live Coverage" icon={MapPin}>
            <div className="h-80 bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-50 rounded-xl border-2 border-dashed border-orange-200 flex flex-col items-center justify-center text-gray-400 hover:border-orange-300 transition-colors duration-300">
              <div className="bg-white p-6 rounded-full shadow-md mb-4 border border-orange-100">
                <MapPin size={48} className="text-orange-500" />
              </div>
              <span className="text-gray-600 font-semibold text-lg">Interactive Vendor Map</span>
              <span className="text-gray-400 text-sm mt-2">Showing vendors checked in within 3 hours</span>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Recent Sales" icon={ReceiptText}>
          <ul className="space-y-3">
            {[
              { order: 1023, amount: 450 },
              { order: 1022, amount: 420 },
              { order: 1021, amount: 390 },
              { order: 1020, amount: 360 },
              { order: 1019, amount: 330 }
            ].map((sale) => (
              <li 
                key={sale.order} 
                className="flex justify-between items-center p-3.5 bg-gradient-to-r from-gray-50 to-orange-50/50 hover:from-orange-50 hover:to-orange-100/70 rounded-xl transition-all duration-200 border border-gray-100 hover:border-orange-200 group cursor-pointer"
              >
                <span className="text-gray-600 text-sm font-medium group-hover:text-orange-700 transition-colors">
                  Order #{sale.order}
                </span>
                <span className="font-bold text-orange-600 text-sm bg-orange-100 px-3.5 py-1.5 rounded-full border border-orange-200 group-hover:bg-orange-200 transition-colors">
                  KES {sale.amount}
                </span>
              </li>
            ))}
          </ul>
          <button className="w-full mt-4 text-orange-600 hover:text-orange-700 font-medium text-sm py-2.5 hover:bg-orange-50 rounded-lg transition-colors duration-200 border border-orange-200 hover:border-orange-300">
            View All Transactions →
          </button>
        </SectionCard>
      </div>

      {/* Activity */}
      <SectionCard title="Recent Vendor Activity" icon={Activity}>
        <div className="space-y-3">
          {activities.map((item, index) => (
            <ActivityItem key={index} {...item} />
          ))}
        </div>
        <button className="w-full mt-5 text-gray-600 hover:text-orange-600 font-medium text-sm py-2.5 hover:bg-orange-50 rounded-lg transition-colors duration-200 border border-gray-200 hover:border-orange-300">
          View Complete Activity Log →
        </button>
      </SectionCard>

    </div>
  );
};

export default AdminDashboard;