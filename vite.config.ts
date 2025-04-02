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
      include: "**/*.{jsx,js,tsx,ts}",  // Processar JSX em arquivos .js também
      babel: {
        presets: [
          ["@babel/preset-react", {
            "runtime": "automatic"
          }]
        ]
      }
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
}));
