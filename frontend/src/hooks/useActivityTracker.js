import { useEffect, useRef } from 'react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const useActivityTracker = () => {
  const { vendorToken } = useContext(AuthContext);
  const intervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (!vendorToken) {
      // Clear interval if not logged in
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Function to update activity
    const updateActivity = async () => {
      try {
        await api.post('/api/auth/activity');
      } catch (error) {
        console.error('Failed to update activity:', error);
      }
    };

    // Update activity every 5 minutes (300000 ms)
    intervalRef.current = setInterval(updateActivity, 300000);

    // Event listeners for user activity
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Add event listeners for various user activities
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [vendorToken]);

  return null;
};

export default useActivityTracker;
