import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, X, ArrowRight, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';

const CartReminder = () => {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();

  // If cart is empty, don't render anything
  if (!cart.items || cart.items.length === 0) return null;

  const handleCompleteOrder = () => {
    // Navigate to the Order Page of that specific vendor
    navigate(`/order/${cart.vendorId}`);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-orange-500 overflow-hidden">
        
        {/* Header */}
        <div className="bg-orange-600 px-4 py-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1.5 rounded-lg">
                <ShoppingBag size={18} className="text-white" />
            </div>
            <div>
                <p className="text-xs font-medium text-orange-100 uppercase tracking-wide">Pending Order</p>
                <p className="font-bold text-sm leading-none">{cart.vendorName}</p>
            </div>
          </div>
          <button 
            onClick={() => { if(window.confirm('Clear cart?')) clearCart() }}
            className="text-white/80 hover:text-white hover:bg-white/20 p-1 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 bg-orange-50/50">
          <div className="flex justify-between items-center text-gray-700 mb-1">
            <span className="text-sm font-medium">{cart.items.reduce((acc, i) => acc + i.qty, 0)} Items in cart</span>
            <span className="font-bold text-lg text-gray-900">KES {cart.total}</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">You have items waiting. Complete your order now.</p>

          <div className="flex gap-2">
            <button 
                onClick={clearCart}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-xs font-bold transition-all flex items-center justify-center gap-1"
            >
                <Trash2 size={14} /> Cancel
            </button>
            <button 
                onClick={handleCompleteOrder}
                className="flex-[2] py-2.5 rounded-xl bg-gray-900 text-white hover:bg-orange-600 text-xs font-bold transition-all shadow-lg hover:shadow-orange-200 flex items-center justify-center gap-2"
            >
                Complete Order <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartReminder;