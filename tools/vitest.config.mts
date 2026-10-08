import { createNodeTestProjects } from '@repo/vitest/node';
import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    projects: createNodeTestProjects({
      include: ['**/*.test.mts'],
      testTimeout: 60_000,
    }),
  },
});
