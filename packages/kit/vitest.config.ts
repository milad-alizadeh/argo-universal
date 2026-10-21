import { createNodeTestProjects } from '@repo/vitest/node';
import { defineProject } from 'vitest/config';

// Node projects cover the kit's non-UI code; the Storybook browser project covers its stories.
export default defineProject({
  test: {
    projects: createNodeTestProjects({ include: ['src/**/*.test.ts'] }),
  },
});
