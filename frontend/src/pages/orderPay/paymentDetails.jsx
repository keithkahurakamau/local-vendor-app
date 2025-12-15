// src/pages/PaymentDetails.jsx
import React, { useState } from "react";

// Simple Card components defined locally
function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl shadow-sm ${className}`}
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E0E0E0",
      }}
    >
      {children}
    </div>
  );
}

function CardContent({ children, className = "" }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

export default function PaymentDetails() {
  const [loading, setLoading] = useState(false);

  const handlePayment = () => {
    alert("Initiating STK push"); // Alert when button is clicked
    setLoading(true);             // Show loading spinner

    // Simulate payment process delay (e.g., 3 seconds)
    setTimeout(() => {
      setLoading(false);
      alert("Payment process completed"); // Optional completion alert
    }, 3000);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#FDFDFD", color: "#2D2D2D" }}
    >
      {/* Main Payment Card */}
      <Card className="w-full max-w-md">
        <CardContent className="space-y-6">
          {/* Order Summary */}
          <Card style={{ borderLeft: "4px solid #FF6B35" }}>
            <CardContent className="text-center space-y-2">
              <h2 className="text-lg font-semibold">Complete your order</h2>
              <p className="text-sm">
                Total price: <strong>KES XXXX</strong>
              </p>
            </CardContent>
          </Card>

          {/* Vendor Details */}
          <Card>
            <CardContent className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-xs font-medium"
                style={{ backgroundColor: "#FFD166" }}
              >
                Vendor
              </div>
              <div>
                <p className="font-medium">Paying</p>
                <p className="text-sm" style={{ color: "#118AB2" }}>
                  Vendor name • Vendor distance • Time stamp
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardContent className="text-sm text-center">
              Enter your <strong>M-Pesa</strong> number to receive a payment
              prompt on your phone
            </CardContent>
          </Card>

          {/* Mobile Number Input */}
          <Card>
            <CardContent className="space-y-2">
              <label className="text-sm font-medium">Mobile Number</label>
              <input
                type="tel"
                placeholder="07XXXXXXXX"
                className="w-full px-3 py-2 rounded-xl focus:outline-none"
                style={{ border: "1px solid #E0E0E0" }}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handlePayment}
              className="w-full py-2 rounded-2xl font-medium"
              style={{ backgroundColor: "#FF6B35", color: "#FFFFFF" }}
              disabled={loading} // Disable button while loading
            >
              {loading ? (
                <span
                  className="spinner"
                  style={{
                    display: "inline-block",
                    width: "1rem",
                    height: "1rem",
                    border: "3px solid #fff",
                    borderTop: "3px solid transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                ></span>
              ) : (
                "Initiate Payment"
              )}
            </button>

            <button
              className="w-full py-2 rounded-2xl font-medium"
              style={{
                backgroundColor: "#FDFDFD",
                color: "#EF476F",
                border: "1px solid #E0E0E0",
              }}
            >
              Cancel
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Spinner CSS */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
