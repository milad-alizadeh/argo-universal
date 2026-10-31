import { createNodeTestProjects } from '@repo/vitest/node';
import { defineProject } from 'vitest/config';

// Node projects cover non-UI code; the Storybook browser project covers stories. The app holds only route wiring today, which web e2e covers, so it may have no unit tests.
export default defineProject({
  test: {
    passWithNoTests: true,
    projects: createNodeTestProjects({
      include: ['src/**/*.test.ts', 'plugins/**/*.test.ts'],
    }),
  },
});
