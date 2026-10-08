import { fileURLToPath } from 'node:url';
import {
  configDefaults,
  type TestProjectInlineConfiguration,
  type TestUserConfig,
} from 'vitest/config';

// Node tests reset mocks, environment and globals, and fail when they assert nothing.
const nodeTest = {
  environment: 'node',
  restoreMocks: true,
  unstubEnvs: true,
  unstubGlobals: true,
  expect: { requireAssertions: true },
} as const;

type NodeTestOptions = Pick<
  TestUserConfig,
  'include' | 'testTimeout' | 'expect'
>;

const unitProject = (
  options: NodeTestOptions,
): TestProjectInlineConfiguration => ({
  extends: false,
  test: {
    ...nodeTest,
    ...options,
    name: 'unit',
    exclude: [...configDefaults.exclude, '**/*.integration.test.*'],
    setupFiles: [fileURLToPath(new URL('./unit-setup.ts', import.meta.url))],
  },
});
const integrationProject = (
  options: NodeTestOptions,
): TestProjectInlineConfiguration => ({
  extends: false,
  test: {
    ...nodeTest,
    ...options,
    name: 'integration',
    include: ['**/*.integration.test.{ts,tsx,mts}'],
  },
});

export const nodeProjects = (
  options: NodeTestOptions = {},
): TestProjectInlineConfiguration[] => [
  unitProject(options),
  integrationProject(options),
];
