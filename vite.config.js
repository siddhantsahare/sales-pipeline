import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './', // Relative paths, so the build also works under github.io/sales-pipeline/.
  plugins: [react(), tailwindcss()],
  test: { globals: true, include: ['tests/**/*.test.js'] },
});
