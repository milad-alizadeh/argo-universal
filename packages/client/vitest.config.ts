import { createNodeTestProjects } from '@repo/vitest/node';
import { defineProject } from 'vitest/config';

// Node projects cover non-UI code; the Storybook browser project covers stories.
export default defineProject({
  test: {
    projects: createNodeTestProjects({
      include: ['src/**/*.test.ts'],
    }),
  },
});
