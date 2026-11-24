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
  'include' | 'exclude' | 'testTimeout' | 'expect'
> & {
  // Test files that measure time, such as event-loop delay or a Hook's budget: they run alone, after the rest.
  budget?: string[];
  // Runs once before the integration tests, such as building what every one of them would build again.
  integrationSetup?: string;
};

type ProjectOptions = Omit<NodeTestOptions, 'budget'> & {
  budget: string[];
  name?: string;
  resolve?: TestProjectInlineConfiguration['resolve'];
};

const createUnitProject = ({
  budget,
  exclude = [],
  integrationSetup: _unused,
  name = 'unit',
  resolve,
  ...options
}: ProjectOptions): TestProjectInlineConfiguration => ({
  extends: false,
  resolve,
  test: {
    ...nodeTest,
    ...options,
    name,
    exclude: [
      ...configDefaults.exclude,
      '**/*.integration.test.*',
      ...budget,
      ...exclude,
    ],
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

// A unit project that resolves modules its own way, such as the phone's `.native.ts` files, and otherwise runs as the others do.
export const createResolvedUnitProject = (
  options: Pick<NodeTestOptions, 'include'> &
    Pick<ProjectOptions, 'name' | 'resolve'>,
): TestProjectInlineConfiguration =>
  createUnitProject({ ...options, budget: [] });
