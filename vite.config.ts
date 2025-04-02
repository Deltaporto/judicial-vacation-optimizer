import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  base: '/judicial-vacation-optimizer/',
  plugins: [
    react({
      include: "**/*.{jsx,js,ts,tsx}",
      babel: {
        plugins: [
          // Isso permite JSX em arquivos .js
          ["@babel/plugin-transform-react-jsx", { runtime: "automatic" }]
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
}));
