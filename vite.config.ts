import { defineConfig } from 'vite'; // Refreshing for .env changes
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
});
