import { defineProject } from 'vitest/config';
import { nodeProjects } from './node.ts';

export default defineProject({
  test: { projects: nodeProjects() },
});
