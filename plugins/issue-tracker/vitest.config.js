import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: new URL('.', import.meta.url).pathname,
  test: {
    include: ['github-tracker.test.js'],
  },
});
