import { defineProject } from 'vitest/config';
import { createNodeTestProjects } from './node.ts';

export default defineProject({
  test: { projects: createNodeTestProjects() },
});
