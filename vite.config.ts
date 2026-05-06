import { defineConfig } from 'vite'; // Refreshing for .env changes
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'lucide-react',
      'recharts',
      '@supabase/supabase-js',
      '@tensorflow/tfjs',
      '@tensorflow-models/mobilenet'
    ]
  }
});
