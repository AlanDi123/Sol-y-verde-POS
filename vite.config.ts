import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(), // Empaqueta todo en el index.html
  ],
  optimizeDeps: {
    exclude: ['dexie'] // Dexie seguirá funcionando para la DB local
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
    
    // Configuraciones obligatorias para vite-plugin-singlefile
    assetsInlineLimit: 100000000, 
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      // Sintaxis actualizada para evitar el warning de deprecación
      output: {
        inlineDynamicImports: true,
      }
    }
  }
});