import React, { useState } from "react";
import { LoginPage } from "./pages/LoginPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";

export const App = () => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("admin_user_data");
    const token = localStorage.getItem("admin_jwt_token");
    if (saved && token && token !== "undefined") {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const handleLogout = () => {
    localStorage.removeItem("admin_jwt_token");
    localStorage.removeItem("admin_user_data");
    setUser(null);
  };

  if (!user) {
    return <LoginPage onLoginSuccess={setUser} />;
  }

  return <AdminDashboardPage user={user} onLogout={handleLogout} />;
};

export default App;
