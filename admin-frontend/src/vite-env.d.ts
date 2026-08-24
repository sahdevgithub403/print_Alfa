/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    showNotification: (title: string, body: string) => void;
  };
}
