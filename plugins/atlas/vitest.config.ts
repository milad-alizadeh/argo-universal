import { defineProject } from 'vitest/config';

// The Plugin's own tests run in Node and fail when they assert nothing.
export default defineProject({
  root: import.meta.dirname,
  test: {
    name: 'atlas',
    environment: 'node',
    // The integration tests build real git repositories.
    testTimeout: 60_000,
    restoreMocks: true,
    expect: { requireAssertions: true },
  },
});
