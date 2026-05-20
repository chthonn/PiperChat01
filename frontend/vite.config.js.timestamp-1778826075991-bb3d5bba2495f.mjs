// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const processEnvShim = {
    REACT_APP_URL: env.REACT_APP_URL || env.VITE_API_URL || "",
    REACT_APP_front_end_url: env.REACT_APP_front_end_url || env.VITE_FRONTEND_URL || "",
    REACT_APP_SUPABASE_URL: env.REACT_APP_SUPABASE_URL || "",
    REACT_APP_SUPABASE_ANON_KEY: env.REACT_APP_SUPABASE_ANON_KEY || "",
    REACT_APP_SUPABASE_BUCKET: env.REACT_APP_SUPABASE_BUCKET || ""
  };
  return {
    plugins: [react(), tailwindcss()],
    define: {
      "process.env": processEnvShim
    },
    server: {
      port: 5173,
      strictPort: true
    },
    build: {
      sourcemap: false
    }
  };
});
export {
  vite_config_default as default
};

