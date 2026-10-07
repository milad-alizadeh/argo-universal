import { nodeTest } from '@repo/vitest/node';
import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    ...nodeTest,
    // RuleTester asserts with node:assert, which Vitest does not count.
    expect: { requireAssertions: false },
    include: ['plugin/**/*.test.ts'],
  },
});
