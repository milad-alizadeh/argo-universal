import { defineProject } from 'vitest/config';

// Plain Vitest runs non-UI code only; components are tested with play functions (spec 0002 section 12).
export default defineProject({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'mocks/**/*.test.ts'],
  },
});
