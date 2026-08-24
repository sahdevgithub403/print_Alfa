import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_jwt_token");
  if (token && token !== "undefined") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("admin_jwt_token");
      localStorage.removeItem("admin_user_data");
      window.location.reload();
    }
    return Promise.reject(error);
  },
);

export const loginAdmin = async (email, password) => {
  const response = await api.post("/auth/login", { email, password });
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
