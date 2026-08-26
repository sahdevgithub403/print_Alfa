import React, { useState, useEffect } from "react";
import { AuthPage } from "./pages/AuthPage";
import { ShopSetupWizard } from "./pages/ShopSetupWizard";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { NotificationPopup } from "./pages/NotificationPopup";
import { getShopProfile } from "./api";
import { Loader2 } from "lucide-react";

export const App = () => {
  const [hash, setHash] = useState(window.location.hash);
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    // Determine if we're in the popup window
    if (window.location.hash.startsWith('#/notification')) {
      setIsInitializing(false);
      return;
    }

    const checkStartupFlow = async () => {
      const token = localStorage.getItem("admin_jwt_token");
      const savedUserStr = localStorage.getItem("admin_user_data");
      
      if (!token || token === "undefined") {
        console.log("[Startup] Not authenticated -> showing login");
        setUser(null);
        setIsInitializing(false);
        return;
      }

      console.log("[Startup] Authenticated -> fetching shop profile");
      try {
        const shopProfile = await getShopProfile();
        console.log("[Startup] Shop data received:", shopProfile);
        
        let currentUser = {};
        try { currentUser = JSON.parse(savedUserStr || "{}"); } catch (e) {}

        currentUser.shopSetupComplete = true;
        currentUser.shopId = shopProfile.id;
        currentUser.shopName = shopProfile.name;
        currentUser.shopSlug = shopProfile.slug;
        
        localStorage.setItem("admin_user_data", JSON.stringify(currentUser));
        setUser(currentUser);
        console.log("[Startup] Setup complete -> Dashboard");
      } catch (err) {
        console.log("[Startup] Setup incomplete or error:", err.message);
        if (err.response?.status === 401) {
          // Token is invalid, let interceptor clear it, but we also clear state here
          setUser(null);
        } else {
          // Assume shop is not setup (400 Bad Request or similar)
          let currentUser = {};
          try { currentUser = JSON.parse(savedUserStr || "{}"); } catch (e) {}
          
          currentUser.shopSetupComplete = false;
          localStorage.setItem("admin_user_data", JSON.stringify(currentUser));
          setUser(currentUser);
          console.log("[Startup] Setup incomplete -> Shop Setup");
        }
      } finally {
        setIsInitializing(false);
      }
    };

    checkStartupFlow();
  }, []);

  if (hash.startsWith('#/notification')) {
    return <NotificationPopup />;
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-black" />
        <p className="text-[#6B6B6B] font-medium animate-pulse">Initializing PrintAlfa...</p>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem("admin_jwt_token");
    localStorage.removeItem("admin_user_data");
    setUser(null);
  };

  const handleSetupComplete = () => {
    // Refresh user state from local storage, but also trigger a full re-fetch to be safe
    setIsInitializing(true);
    getShopProfile()
      .then((shopProfile) => {
        const userData = JSON.parse(localStorage.getItem("admin_user_data") || "{}");
        userData.shopSetupComplete = true;
        userData.shopId = shopProfile.id;
        userData.shopName = shopProfile.name;
        userData.shopSlug = shopProfile.slug;
        localStorage.setItem("admin_user_data", JSON.stringify(userData));
        setUser(userData);
      })
      .catch((err) => {
        console.error("Failed to load profile after setup:", err);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  };

  if (!user) {
    return <AuthPage onLoginSuccess={() => {
      // Upon login success, trigger initialization again to fetch profile
      setIsInitializing(true);
      // We need to delay slightly so localStorage propagates if login doesn't await
      setTimeout(() => {
        const token = localStorage.getItem("admin_jwt_token");
        if(token) {
          getShopProfile().then((shopProfile) => {
             const userData = JSON.parse(localStorage.getItem("admin_user_data") || "{}");
             userData.shopSetupComplete = true;
             userData.shopId = shopProfile.id;
             localStorage.setItem("admin_user_data", JSON.stringify(userData));
             setUser(userData);
          }).catch(() => {
             const userData = JSON.parse(localStorage.getItem("admin_user_data") || "{}");
             userData.shopSetupComplete = false;
             localStorage.setItem("admin_user_data", JSON.stringify(userData));
             setUser(userData);
          }).finally(() => setIsInitializing(false));
        }
      }, 100);
    }} />;
  }

  if (!user.shopSetupComplete) {
    return <ShopSetupWizard onSetupComplete={handleSetupComplete} />;
  }

  return <AdminDashboardPage user={user} onLogout={handleLogout} />;
};

export default App;
