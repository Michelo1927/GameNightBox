import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative paths so the site works under https://<user>.github.io/<repo>/
  base: './',
  plugins: [react()],
});
