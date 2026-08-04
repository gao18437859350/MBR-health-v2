import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  optimizeDeps: {
    // 沙箱环境下 esbuild 无法遍历父目录，禁用依赖预打包
    disabled: false,
    esbuild: {
      target: "esnext",
    },
  },
});
