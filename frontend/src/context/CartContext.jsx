import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  // Load from local storage initially
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('local_vendor_cart');
    return saved ? JSON.parse(saved) : { vendorId: null, vendorName: '', items: [], total: 0 };
  });

  useEffect(() => {
    localStorage.setItem('local_vendor_cart', JSON.stringify(cart));
  }, [cart]);

  // --- ADD ITEM (Enforces Single Vendor) ---
  const addToCart = (vendor, item) => {
    // 1. Check if cart has items from a DIFFERENT vendor
    if (cart.vendorId && cart.vendorId !== vendor.id && cart.items.length > 0) {
      const confirmSwitch = window.confirm(
        `You have a pending order from "${cart.vendorName}".\n\nStart a new order with "${vendor.name}" instead? This will clear your current cart.`
      );
      
      if (!confirmSwitch) return false; // User cancelled
      
      // User confirmed: Clear old cart and start new
      const newItem = { ...item, qty: 1 };
      setCart({
        vendorId: vendor.id,
        vendorName: vendor.name,
        items: [newItem],
        total: newItem.price
      });
      return true;
    }

    // 2. Same vendor or empty cart: Proceed
    setCart((prev) => {
      const existing = prev.items.find((i) => i.id === item.id);
      let newItems;
      
      if (existing) {
        newItems = prev.items.map((i) => 
          i.id === item.id ? { ...i, qty: i.qty + 1 } : i
        );
      } else {
        newItems = [...prev.items, { ...item, qty: 1 }];
      }

      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        items: newItems,
        total: prev.total + item.price
      };
    });
    return true;
  };

  // --- REMOVE ITEM ---
  const removeFromCart = (itemId) => {
    setCart((prev) => {
      const item = prev.items.find((i) => i.id === itemId);
      if (!item) return prev;

      let newItems;
      if (item.qty > 1) {
        newItems = prev.items.map((i) => 
          i.id === itemId ? { ...i, qty: i.qty - 1 } : i
        );
      } else {
        newItems = prev.items.filter((i) => i.id !== itemId);
      }

      const newTotal = prev.total - item.price;
      
      // If empty, reset vendor info too
      if (newItems.length === 0) {
        return { vendorId: null, vendorName: '', items: [], total: 0 };
      }

      return { ...prev, items: newItems, total: newTotal };
    });
  };

  // --- CLEAR CART ---
  const clearCart = () => {
    setCart({ vendorId: null, vendorName: '', items: [], total: 0 });
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};