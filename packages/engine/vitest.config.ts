import { createNodeTestProjects } from '@repo/vitest/node';
import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    projects: createNodeTestProjects({
      budget: ['src/feed/feed-workload.integration.test.ts'],
    }),
  },
});
