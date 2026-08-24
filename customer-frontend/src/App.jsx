import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CustomerShopPage } from "./pages/CustomerShopPage";
import { OrderTrackingPage } from "./pages/OrderTrackingPage";

export const App = () => {
  return (
    <Routes>
      <Route path="/shop/:shopSlug" element={<CustomerShopPage />} />
      <Route path="/order/:publicToken" element={<OrderTrackingPage />} />
      <Route path="*" element={<Navigate to="/shop/quickprint" replace />} />
    </Routes>
  );
};

export default App;
