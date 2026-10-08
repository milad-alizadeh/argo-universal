import { nodeProjects } from '@repo/vitest/node';
import { defineProject } from 'vitest/config';

export default defineProject({
  test: { projects: nodeProjects() },
});
