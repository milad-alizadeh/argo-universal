import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Every package is a project; an app joins by adding its own vitest.config.ts.
    projects: [
      'packages/*',
      'apps/*/vitest.config.{ts,mts}',
      'tooling/vitest',
      'tooling/oxlint',
      'tools/vitest.config.mts',
    ],
    passWithNoTests: true,
  },
});
