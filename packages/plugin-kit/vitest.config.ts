import { createNodeTestProjects } from '@repo/vitest/node';
import { defineProject } from 'vitest/config';
import { pluginTestTimeoutMs } from './testing/test-timeout.ts';

export default defineProject({
  root: import.meta.dirname,
  test: {
    projects: createNodeTestProjects({ testTimeout: pluginTestTimeoutMs }),
  },
});
