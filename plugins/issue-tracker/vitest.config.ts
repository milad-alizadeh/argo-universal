import { defineProject } from 'vitest/config';

// Node tests reset mocks and fail when they assert nothing, as the Argo packages' do.
export default defineProject({
  root: import.meta.dirname,
  test: {
    name: 'issue-tracker',
    environment: 'node',
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    expect: { requireAssertions: true },
  },
});
