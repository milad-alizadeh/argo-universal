import { defineProject } from 'vitest/config';

// The Plugin's own tests run in Node and fail when they assert nothing.
export default defineProject({
  root: import.meta.dirname,
  test: {
    name: 'code-map',
    environment: 'node',
    restoreMocks: true,
    expect: { requireAssertions: true },
  },
});
