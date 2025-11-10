import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base =
    env.VITE_APP_BASE_PATH && env.VITE_APP_BASE_PATH.trim().length > 0
      ? env.VITE_APP_BASE_PATH
      : "/admin/crm/";
  return {
    base,
    plugins: [react()],
    server: {
      port: 3000,
      open: true,
      proxy: {
        // Proxy any /api requests to the backend to avoid CORS in dev
        "/api": {
          target: env.VITE_PROXY_TARGET || "http://192.168.30.28:3000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
