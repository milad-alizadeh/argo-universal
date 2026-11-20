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
> & {
  // Runs once before the integration tests, such as building what every one of them would build again.
  integrationSetup?: string;
};

const createUnitProject = ({
  integrationSetup: _unused,
  ...options
}: NodeTestOptions): TestProjectInlineConfiguration => ({
  extends: false,
  test: {
    ...nodeTest,
    ...options,
    name: 'unit',
    exclude: [...configDefaults.exclude, '**/*.integration.test.*'],
    setupFiles: [fileURLToPath(new URL('./unit-setup.ts', import.meta.url))],
  },
});

const createIntegrationProject = ({
  integrationSetup,
  ...options
}: NodeTestOptions): TestProjectInlineConfiguration => ({
  extends: false,
  test: {
    ...nodeTest,
    ...options,
    globalSetup: integrationSetup === undefined ? [] : [integrationSetup],
    name: 'integration',
    include: ['**/*.integration.test.{ts,tsx,mts}'],
  },
});

export const createNodeTestProjects = (
  options: NodeTestOptions = {},
): TestProjectInlineConfiguration[] => [
  createUnitProject(options),
  createIntegrationProject(options),
];
