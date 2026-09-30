import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/digi-map-layers/' : '/',
  plugins: [react()],
  test: { environment: 'jsdom', restoreMocks: true, clearMocks: true },
}));
