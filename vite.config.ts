import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build to dist/ — Firebase Hosting serves it. Static assets (favicon,
// manifest, sw.js, firebase-messaging-sw.js) live in public/ and are copied
// to the dist root as-is.
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist' },
});
