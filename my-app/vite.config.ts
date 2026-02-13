import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Only load HTTPS certs in development if they exist
const getHttpsConfig = () => {
  const keyPath = path.resolve(__dirname, 'certs/localhost+2-key.pem');
  const certPath = path.resolve(__dirname, 'certs/localhost+2.pem');
  
  // Only use HTTPS if certs exist (local development)
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  }
  return undefined;
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    https: getHttpsConfig(),
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
