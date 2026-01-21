import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          pdf: ["react-pdf", "pdfjs-dist"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    strictPort: false,
    proxy: {
      "/api": {
        target:
          process.env.VITE_API_BASE_URL ||
          "https://submittalfactory.com/gemini-prod",
        changeOrigin: true,
        secure: false,
        ws: true,
        timeout: 1500000,
        configure: (proxy, options) => {
          // Set socket keepalive for long connections
          proxy.on("proxyReq", (proxyReq, req) => {
            if (req.socket) {
              req.socket.setKeepAlive(true, 30000);
            }
          });

          proxy.on("error", (err, req) => {
            console.log("🚨 PROXY ERROR:", err.message);
            console.log("📍 Request URL:", req.url || "unknown");
            console.log("🎯 Target:", options.target || "unknown");

            // Check for timeout-related errors
            const errorMessage = err.message.toLowerCase();
            if (
              errorMessage.includes("econnreset") ||
              errorMessage.includes("etimedout") ||
              errorMessage.includes("timeout")
            ) {
              console.log("⏱️ This appears to be a timeout error.");
              console.log(
                "💡 For long-running operations, the backend may still be processing."
              );
            }
          });

          proxy.on("proxyRes", (proxyRes, req) => {
            const status = proxyRes.statusCode;
            const emoji = status && status < 400 ? "✅" : "❌";
            console.log(
              `${emoji} PROXY RESPONSE:`,
              status,
              req.url || "unknown"
            );
          });
        },
      },
    },
  },
  preview: {
    port: 4173,
    host: "0.0.0.0",
    strictPort: false,
  },
});
