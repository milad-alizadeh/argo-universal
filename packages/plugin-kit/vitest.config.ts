import { createNodeTestProjects } from '@repo/vitest/node';
import { defineProject } from 'vitest/config';
import { pluginTestTimeoutMs } from './testing/test-timeout.ts';

export default defineProject({
  root: import.meta.dirname,
  test: {
    projects: createNodeTestProjects({
      testTimeout: pluginTestTimeoutMs,
      budget: [
        'testing/hook-budgets.integration.test.ts',
        'testing/hook-render-budget.integration.test.ts',
        'testing/loader-background-budget.integration.test.ts',
        'testing/loader-watch.integration.test.ts',
      ],
    }),
  },
});
