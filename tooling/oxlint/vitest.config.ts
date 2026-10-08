import { nodeProjects } from '@repo/vitest/node';
import { defineProject } from 'vitest/config';

// RuleTester asserts with node:assert, which Vitest does not count.
export default defineProject({
  test: {
    projects: nodeProjects({
      include: ['plugin/**/*.test.ts'],
      expect: { requireAssertions: false },
    }),
  },
});
