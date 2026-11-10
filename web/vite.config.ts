import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://cicrews2012.github.io/family-dashboard/
export default defineConfig({
  base: "/family-dashboard/",
  plugins: [react()],
});
