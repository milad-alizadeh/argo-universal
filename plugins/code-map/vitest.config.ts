import { createNodeTestProjects } from '@repo/vitest/node';
import { defineProject } from 'vitest/config';

export default defineProject({
  root: import.meta.dirname,
  test: { projects: createNodeTestProjects() },
});
