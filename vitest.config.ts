import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Every package is a project; an app joins by adding its own vitest.config.ts.
    projects: [
      'packages/*',
      'apps/*/vitest.config.{ts,mts}',
      'mocks',
      'tools/vitest.config.mts',
    ],
    // The scaffold has no tests yet, and Vitest exits 1 when it finds none.
    passWithNoTests: true,
  },
});
