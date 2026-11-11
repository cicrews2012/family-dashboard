import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const version = process.env.VITE_APP_VERSION || "dev";
const commit = (process.env.VITE_APP_COMMIT || "local").slice(0, 7);

/** Writes version.json next to the app so open screens can spot a new deploy. */
function versionFile(): Plugin {
  return {
    name: "version-file",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version, commit, builtAt: new Date().toISOString() }),
      });
    },
  };
}

// Served from https://cicrews2012.github.io/family-dashboard/
export default defineConfig({
  base: "/family-dashboard/",
  plugins: [react(), versionFile()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(commit),
  },
});
