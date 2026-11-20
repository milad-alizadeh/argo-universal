import { defineProject } from 'vitest/config';

// db imports no workspace package (ADR-0013), so it states @repo/vitest's Node settings itself; its tests are integration tests.
export default defineProject({
  test: {
    name: 'integration',
    environment: 'node',
    include: ['**/*.integration.test.ts'],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    expect: { requireAssertions: true },
  },
});
