import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CustomerShopPage } from "./pages/CustomerShopPage";
import { OrderTrackingPage } from "./pages/OrderTrackingPage";

export const App = () => {
  return (
    <Routes>
      <Route path="/shop/:shopSlug" element={<CustomerShopPage />} />
      <Route path="/order/:publicToken" element={<OrderTrackingPage />} />
      <Route path="*" element={
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50">
          <h1 className="text-2xl font-bold mb-2">Shop Not Found</h1>
          <p className="text-gray-500">Please scan a valid PrintAlfa shop QR code to place an order.</p>
        </div>
      } />
    </Routes>
  );
};

export default App;
