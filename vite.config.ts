import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  resolve: process.env.VITEST
    ? {
        conditions: ['browser'],
      }
    : undefined,
});
