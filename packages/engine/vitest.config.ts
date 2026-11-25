import { fileURLToPath } from 'node:url';
import { createNodeTestProjects } from '@repo/vitest/node';
import { defineProject } from 'vitest/config';

const integrationSetup = fileURLToPath(
  new URL('./mocks/prebuilt-fixtures.global-setup.ts', import.meta.url),
);

export default defineProject({
  test: {
    projects: createNodeTestProjects({
      budget: ['src/feed/feed-workload.integration.test.ts'],
      integrationSetup,
    }),
  },
});
