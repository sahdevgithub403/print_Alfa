import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem("admin_jwt_token");
  if (token && token !== "undefined") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add device headers for session management
  if (window.electronAPI && window.electronAPI.getDeviceId) {
    config.headers["X-Device-ID"] = await window.electronAPI.getDeviceId();
    config.headers["X-Device-Name"] = await window.electronAPI.getDeviceName();
    config.headers["X-App-Version"] = await window.electronAPI.getAppVersion();
  } else {
    config.headers["X-Device-ID"] = "browser-dev-123";
    config.headers["X-Device-Name"] = "Browser (Dev)";
    config.headers["X-App-Version"] = "1.0.0-dev";
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("AUTH 401:", {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        response: error.response?.data,
      });
    }

    return Promise.reject(error);
  },
);

export const loginAdmin = async (email, password) => {
  const response = await api.post("/auth/login", { email, password });
  return response.data.data;
};

export const signupAdmin = async (name, phone, email, password, confirmPassword) => {
  const response = await api.post("/auth/signup", { name, phone, email, password, confirmPassword });
  return response.data.data;
};

export const forgotPassword = async (email) => {
  const response = await api.post("/auth/forgot-password", { email });
  return response.data.data;
};

export const resetPassword = async (token, newPassword) => {
  const response = await api.post("/auth/reset-password", { token, newPassword });
  return response.data.data;
};

export const getShopProfile = async () => {
  const response = await api.get("/admin/shop");
  return response.data.data;
};

export const createShop = async (shopData) => {
  const response = await api.post("/admin/shop/create", shopData);
  return response.data.data;
};

export const sendHeartbeat = async () => {
  const response = await api.post("/print-agent/heartbeat");
  return response.data.data;
};

export const getAdminOrders = async (status) => {
  const params = status ? { status } : {};
  const response = await api.get("/admin/orders", { params });
  return response.data.data;
};

export const updateOrderPrintStatus = async (orderId, printStatus) => {
  const response = await api.patch(`/admin/orders/${orderId}/status`, {
    printStatus,
  });
  return response.data.data;
};

export const updateItemPrintStatus = async (orderId, itemId, printStatus) => {
  const response = await api.patch(
    `/admin/orders/${orderId}/items/${itemId}/status`,
    { printStatus },
  );
  return response.data.data;
};

export const updateOrderPaymentStatus = async (orderId, paymentStatus) => {
  const response = await api.patch(`/admin/orders/${orderId}/payment-status`, {
    paymentStatus,
  });
  return response.data.data;
};

export const getShopPricing = async () => {
  const response = await api.get("/admin/pricing");
  return response.data.data;
};

export const updateShopPricing = async (pricingData) => {
  const response = await api.put("/admin/pricing", pricingData);
  return response.data.data;
};

export const getShopQRData = async () => {
  const response = await api.get("/admin/shop/qr");
  return response.data.data;
};

export const downloadDocumentFile = async (documentId, originalFileName) => {
  const response = await api.get(`/admin/documents/${documentId}/download`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", originalFileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const getDocumentPreviewUrl = async (documentId, contentType) => {
  const response = await api.get(`/admin/documents/${documentId}/download`, {
    responseType: "blob",
  });
  return window.URL.createObjectURL(
    new Blob([response.data], { type: contentType }),
  );
};
