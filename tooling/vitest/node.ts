// Node tests start with real mocks, environment and globals, and fail when they assert nothing.
export const nodeTest = {
  environment: 'node',
  restoreMocks: true,
  unstubEnvs: true,
  unstubGlobals: true,
  expect: { requireAssertions: true },
} as const;
