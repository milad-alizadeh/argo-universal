import { createNodeTestProjects } from '@repo/vitest/node';
import { defineProject } from 'vitest/config';

export default defineProject({
  root: import.meta.dirname,
  test: {
    projects: createNodeTestProjects({
      // Reads a scripted GitHub whose Checks move on a timer, so it runs alone after the rest.
      budget: ['checks.integration.test.ts'],
    }),
  },
});
