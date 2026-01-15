import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiHome, FiRefreshCw, FiAlertCircle, FiSmartphone } from 'react-icons/fi';
import mapService from '../../services/mapService';

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { amount, vendor, phone, orderId, paymentResponse } = location.state || {};

  const [status, setStatus] = useState('pending'); // pending, success, failed
  const [message, setMessage] = useState('Please enter your M-Pesa PIN...');
  const [loading, setLoading] = useState(false);

  // Auto-check status every 3 seconds
  useEffect(() => {
    if (!paymentResponse?.checkout_id) return;

    let attempts = 0;
    const maxAttempts = 20; // Stop polling after ~60 seconds

    const interval = setInterval(async () => {
      attempts++;
      
      // Stop logic
      if (status === 'success' || status === 'failed' || attempts > maxAttempts) {
        clearInterval(interval);
        if (attempts > maxAttempts && status === 'pending') {
            setMessage("Connection timed out. If you paid, you will receive an SMS confirmation.");
        }
        return;
      }

      await checkStatus();
    }, 3000); 

    return () => clearInterval(interval);
  }, [paymentResponse, status]);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const checkoutId = paymentResponse?.checkout_id;
      
      const data = await mapService.checkPaymentStatus(checkoutId);
      console.log("Polling Status:", data.status);

      if (data.status === 'SUCCESSFUL') {
        setStatus('success');
        setMessage('Payment received successfully!');
      } else if (data.status === 'FAILED') {
        setStatus('failed');
        setMessage('Payment was cancelled or failed.');
      } 
      // If PENDING, loop continues

    } catch (error) {
      console.error("Status check failed", error);
    } finally {
      setLoading(false);
    }
  };

  if (!location.state) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50 p-6 text-center">
        <div className="bg-red-50 p-4 rounded-full mb-4 border border-red-100">
             <FiAlertCircle className="text-4xl text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Invalid Access</h2>
        <button onClick={() => navigate('/')} className="mt-6 text-orange-600 font-bold hover:underline">
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl shadow-orange-100/50 overflow-hidden border border-orange-100">
        
        {/* Status Header */}
        <div className={`p-8 text-center border-b transition-colors duration-500 ${
          status === 'success' ? 'bg-green-50 border-green-100' : 
          status === 'failed' ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'
        }`}>
          <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-4 shadow-sm border-4 border-white ${
            status === 'success' ? 'bg-green-100 text-green-600' : 
            status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
          }`}>
            {status === 'success' ? <FiCheckCircle size={48} className="animate-bounce-short" /> :
             status === 'failed' ? <FiAlertCircle size={48} /> :
             <FiSmartphone size={48} className="animate-pulse" />}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {status === 'success' ? 'Order Confirmed!' : 
             status === 'failed' ? 'Payment Failed' : 'Check your phone'}
          </h2>
          <p className={`text-sm font-medium ${
              status === 'pending' ? 'text-orange-600 animate-pulse' : 'text-gray-600'
          }`}>
              {message}
          </p>
        </div>

        {/* Order Details */}
        <div className="p-6 space-y-4 bg-white">
          <div className="flex justify-between py-3 border-b border-orange-50">
            <span className="text-gray-500 text-sm">Order ID</span>
            <span className="font-mono font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded text-sm">{orderId}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-orange-50">
            <span className="text-gray-500 text-sm">Amount Paid</span>
            <span className="font-bold text-gray-900 text-lg">KES {amount?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-orange-50">
            <span className="text-gray-500 text-sm">Vendor</span>
            <span className="font-bold text-gray-900">{vendor?.name}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-orange-50">
            <span className="text-gray-500 text-sm">Phone</span>
            <span className="font-bold text-gray-900">{phone}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-orange-50/30 space-y-3">
          {status === 'pending' && (
            <button 
              onClick={checkStatus}
              disabled={loading}
              className="w-full py-3.5 bg-white border border-orange-200 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-orange-50 hover:border-orange-300 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div> : <FiRefreshCw className="text-orange-500"/>}
              I've Entered My PIN
            </button>
          )}
          
          {/* Navigation Button Logic */}
          {status !== 'pending' ? (
              <button 
                onClick={() => navigate('/')}
                className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-orange-600 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
              >
                <FiHome /> Return to Home
              </button>
          ) : (
              <button 
                onClick={() => navigate('/')}
                className="w-full py-3.5 bg-transparent text-gray-500 font-bold hover:text-red-500 transition-colors"
              >
                Cancel & Return Home
              </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;