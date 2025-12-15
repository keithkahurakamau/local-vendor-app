import React from "react";
import {BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PaymentDetails from "./pages/orderPay/paymentDetails";


function App() {

  return (
      
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/payment" replace />} />
            <Route path="/payment" element={<PaymentDetails />} />
          </Routes>
        </BrowserRouter>
    
      
  )
}

export default App
