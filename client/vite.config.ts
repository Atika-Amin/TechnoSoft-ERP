import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],
  server: {
    host: true, // let other devices on your Wi-Fi open the site
    // Phone → Vite (https) → backend (http on this laptop). Avoids "mixed content" blocking.
    proxy: { '/api': 'http://localhost:3000' },
  },
});