import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
export default defineConfig({
  base:"./",
  plugins:[react()],
  build:{outDir:"dist",emptyOutDir:true,rollupOptions:{input:{main:resolve(__dirname,"index.html"),admin:resolve(__dirname,"admin.html")}}},
  server:{proxy:{"/api.php":"http://localhost"}}
});
