import { createNodeTestProjects } from '@repo/vitest/node';
import { defineProject } from 'vitest/config';

// hello.test.js runs under `argo plugin test`; Vitest runs the journeys only.
export default defineProject({
  root: import.meta.dirname,
  test: { projects: createNodeTestProjects({ include: ['**/*.test.ts'] }) },
});
