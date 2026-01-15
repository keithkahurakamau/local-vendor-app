import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiXCircle, FiRefreshCw, FiHome, FiAlertTriangle } from 'react-icons/fi';

const PaymentFailed = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Retrieve data passed from the error handler
  const { error, vendor, cart } = location.state || {};

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="bg-red-50 p-8 text-center">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
            <FiXCircle size={40} className="text-red-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
          <p className="text-gray-600 text-sm">
            {error || "We couldn't process your payment. This might be due to an M-Pesa timeout or insufficient funds."}
          </p>
        </div>

        {/* Suggestion / Details */}
        <div className="p-6 space-y-4">
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex gap-3 items-start">
            <FiAlertTriangle className="text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-1">Troubleshooting Tips:</p>
              <ul className="list-disc pl-4 space-y-1 text-gray-600">
                <li>Check your M-Pesa balance.</li>
                <li>Ensure your phone is unlocked.</li>
                <li>Wait for the STK prompt to appear.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-3">
          <button 
            onClick={() => navigate('/payment', { state: { vendor, cart } })}
            className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-gray-800 flex items-center justify-center gap-2 transition-all transform active:scale-95"
          >
            <FiRefreshCw /> Try Payment Again
          </button>
          
          <button 
            onClick={() => navigate('/')}
            className="w-full py-3.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-100 flex items-center justify-center gap-2 transition-colors"
          >
            <FiHome /> Return Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;