import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  server: {
    open: true,
    fs: {
      allow: ['C:/Users/Lenovo/Desktop/X_factor'],
    },
  },
});
