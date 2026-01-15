import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiHome, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { customerAPI } from '../../services/api';

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { amount, vendor, phone, orderId, paymentResponse } = location.state || {};

  const [status, setStatus] = useState('pending'); // pending, success, failed
  const [message, setMessage] = useState('Waiting for M-Pesa confirmation...');
  const [loading, setLoading] = useState(false);

  // Auto-check status every 5 seconds for 30 seconds
  useEffect(() => {
    if (!orderId) return;

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 6 || status === 'success') {
        clearInterval(interval);
        return;
      }
      await checkStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [orderId, status]);

  const checkStatus = async () => {
    setLoading(true);
    try {
      // Use the checkout ID from the response if available, otherwise orderId
      const checkoutId = paymentResponse?.CheckoutRequestID || orderId;
      
      // In a real app, you'd call the backend to check STK push status
      // const res = await customerAPI.checkPaymentStatus(checkoutId);
      
      // SIMULATION FOR DEMO:
      // We'll just simulate a success after a manual check or randomly
      const isSuccess = true; 

      if (isSuccess) {
        setStatus('success');
        setMessage('Payment received successfully!');
      }
    } catch (error) {
      console.error("Status check failed", error);
    } finally {
      setLoading(false);
    }
  };

  if (!location.state) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <FiAlertCircle className="text-4xl text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Invalid Access</h2>
        <button onClick={() => navigate('/')} className="mt-6 text-orange-600 font-bold hover:underline">
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden">
        
        {/* Status Header */}
        <div className={`p-8 text-center ${
          status === 'success' ? 'bg-green-50' : 
          status === 'failed' ? 'bg-red-50' : 'bg-orange-50'
        }`}>
          <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-sm ${
            status === 'success' ? 'bg-green-100 text-green-600' : 
            status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
          }`}>
            {status === 'success' ? <FiCheckCircle size={40} /> :
             status === 'failed' ? <FiAlertCircle size={40} /> :
             <FiClock size={40} className="animate-pulse" />}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {status === 'success' ? 'Order Confirmed!' : 
             status === 'failed' ? 'Payment Failed' : 'Check your phone'}
          </h2>
          <p className="text-gray-600 text-sm">{message}</p>
        </div>

        {/* Order Details */}
        <div className="p-6 space-y-4">
          <div className="flex justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">Order ID</span>
            <span className="font-mono font-bold text-gray-900">{orderId}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">Amount Paid</span>
            <span className="font-bold text-gray-900">KES {amount?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">Vendor</span>
            <span className="font-bold text-gray-900">{vendor?.name}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-100">
            <span className="text-gray-500">Phone</span>
            <span className="font-bold text-gray-900">{phone}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 space-y-3">
          {status === 'pending' && (
            <button 
              onClick={checkStatus}
              disabled={loading}
              className="w-full py-3.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div> : <FiRefreshCw />}
              I've Entered My PIN
            </button>
          )}
          
          <button 
            onClick={() => navigate('/')}
            className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-gray-800 flex items-center justify-center gap-2"
          >
            <FiHome /> Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;