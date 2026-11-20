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
  // Test files that measure time, such as event-loop delay or a Hook's budget: they run alone, after the rest.
  budget?: string[];
  // Runs once before the integration tests, such as building what every one of them would build again.
  integrationSetup?: string;
};

type ProjectOptions = Omit<NodeTestOptions, 'budget'> & { budget: string[] };

const createUnitProject = ({
  budget,
  integrationSetup: _unused,
  ...options
}: ProjectOptions): TestProjectInlineConfiguration => ({
  extends: false,
  test: {
    ...nodeTest,
    ...options,
    name: 'unit',
    exclude: [...configDefaults.exclude, '**/*.integration.test.*', ...budget],
    setupFiles: [fileURLToPath(new URL('./unit-setup.ts', import.meta.url))],
  },
});

const createIntegrationProject = ({
  budget,
  integrationSetup,
  ...options
}: ProjectOptions): TestProjectInlineConfiguration => ({
  extends: false,
  test: {
    ...nodeTest,
    ...options,
    globalSetup: integrationSetup === undefined ? [] : [integrationSetup],
    name: 'integration',
    include: ['**/*.integration.test.{ts,tsx,mts}'],
    exclude: [...configDefaults.exclude, ...budget],
  },
});

// One worker, in a later group: a timing budget holds only when no other test shares the cores.
const createBudgetProject = ({
  budget,
  integrationSetup,
  ...options
}: ProjectOptions): TestProjectInlineConfiguration => ({
  extends: false,
  test: {
    ...nodeTest,
    ...options,
    globalSetup: integrationSetup === undefined ? [] : [integrationSetup],
    name: 'budget',
    include: budget,
    maxWorkers: 1,
    fileParallelism: false,
    sequence: { groupOrder: 1 },
  },
});

export const createNodeTestProjects = ({
  budget = [],
  ...options
}: NodeTestOptions = {}): TestProjectInlineConfiguration[] => {
  const projects = [
    createUnitProject({ ...options, budget }),
    createIntegrationProject({ ...options, budget }),
  ];

  return budget.length > 0
    ? [...projects, createBudgetProject({ ...options, budget })]
    : projects;
};
