import { expect, it } from 'vitest';
import {
  dangerousModeOptions,
  newSessionBranches,
  newSessionCatalogs,
  newSessionInputs,
  newSessionOptions,
  unreachableServices,
} from '../../mocks';
import { appRouter } from '../root';

it.each(Object.entries(newSessionCatalogs))(
  'serves the %s New Session catalog mock',
  async (_, catalog) => {
    const caller = appRouter.createCaller({
      services: unreachableServices({ agents: { list: async () => catalog } }),
    });
    await expect(caller.agents.list()).resolves.toEqual(catalog);
  },
);

it.each(newSessionInputs)(
  'serves the recorded image prompt for $agent',
  async (input) => {
    const caller = appRouter.createCaller({
      services: unreachableServices({
        session: { new: async () => ({ sessionId: 'image-session' }) },
      }),
    });
    await expect(caller.session.new(input)).resolves.toEqual({
      sessionId: 'image-session',
    });
    expect(input.prompt).toContainEqual(
      expect.objectContaining({
        type: 'image',
        blob: expect.objectContaining({ width: 32, height: 32 }),
      }),
    );
  },
);

it('offers model-specific efforts, including a model without effort, and a selected dangerous mode for each Agent', () => {
  const models = newSessionOptions.flatMap(
    ({ configOptionsByModel }) => configOptionsByModel,
  );
  expect(
    models.some(
      (options) =>
        !options.some((option) => option.category === 'thought_level'),
    ),
  ).toBe(true);
  const choices = models.map((options) =>
    options.find((option) => option.category === 'thought_level'),
  );
  expect(
    new Set(
      choices.map((option) =>
        option?.type === 'select' ? option.options.length : 0,
      ),
    ).size,
  ).toBeGreaterThan(2);
  for (const { configOptions } of dangerousModeOptions) {
    const mode = configOptions.find((option) => option.category === 'mode');
    if (mode?.type !== 'select') throw new Error('Missing mode mock');
    const selected = mode.options.find(
      (choice) => 'value' in choice && choice.value === mode.currentValue,
    );
    expect(selected?._meta?.argo?.tone).toBe('dangerous');
  }
});

it('serves the branch mock through its procedure contract', async () => {
  const caller = appRouter.createCaller({
    services: unreachableServices({
      projects: { branches: async () => newSessionBranches },
    }),
  });
  await expect(
    caller.projects.branches({ projectId: 'project-1' }),
  ).resolves.toEqual({
    branches: ['main', 'feature/new-session', 'release'],
    currentBranch: 'main',
  });
});
