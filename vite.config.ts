import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { URL, fileURLToPath } from 'node:url'; // Correct imports for ESM
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    dts({ insertTypesEntry: true })
  ],
  build: {
    lib: {
      // Use the modern, ESM-correct way to define the entry point
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'YzDevReactDynamicModule',
      formats: ['es', 'umd'],
      fileName: (format) => `yz-dev-react-dynamic-module.${format}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});