import {
  dangerousModeOptions,
  newSessionBranches,
  newSessionCatalogs,
  newSessionInputs,
  newSessionOptions,
} from '@repo/api/mocks';
import type { SessionNewOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { unreachableServices } from '#mocks/services';
import { appRouter } from '../../engine/router';

it.each(Object.entries(newSessionCatalogs))(
  'serves the %s New Session catalog mock',
  async (_, catalog): Promise<void> => {
    const caller = appRouter.createCaller({
      services: unreachableServices({
        agents: { list: async (): Promise<typeof catalog> => catalog },
      }),
    });
    await expect(caller.agents.list()).resolves.toEqual(catalog);
  },
);

it.each(newSessionInputs)(
  'serves the recorded image prompt for $agent',
  async (input): Promise<void> => {
    const caller = appRouter.createCaller({
      services: unreachableServices({
        session: {
          new: async (): Promise<SessionNewOutput> => ({
            sessionId: 'image-session',
          }),
        },
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

it('offers model-specific efforts, including a model without effort, and a selected dangerous mode for each Agent', (): void => {
  const models = newSessionOptions.flatMap(
    ({ configOptionsByModel }): typeof configOptionsByModel =>
      configOptionsByModel,
  );
  expect(
    models.some(
      (options): boolean =>
        !options.some((option): boolean => option.category === 'thought_level'),
    ),
  ).toBe(true);
  const choices = models.map((options): (typeof options)[number] | undefined =>
    options.find((option): boolean => option.category === 'thought_level'),
  );
  expect(
    new Set(
      choices.map((option): number =>
        option?.type === 'select' ? option.options.length : 0,
      ),
    ).size,
  ).toBeGreaterThan(2);
  for (const { configOptions } of dangerousModeOptions) {
    const mode = configOptions.find(
      (option): boolean => option.category === 'mode',
    );
    if (mode?.type !== 'select') throw new Error('Missing mode mock');
    const selected = mode.options.find(
      (choice): boolean =>
        'value' in choice && choice.value === mode.currentValue,
    );
    expect(selected?._meta?.argo?.tone).toBe('dangerous');
  }
});

it('serves the branch mock through its procedure contract', async (): Promise<void> => {
  const caller = appRouter.createCaller({
    services: unreachableServices({
      projects: {
        branches: async (): Promise<typeof newSessionBranches> =>
          newSessionBranches,
      },
    }),
  });
  await expect(
    caller.projects.branches({ projectId: 'project-1' }),
  ).resolves.toEqual({
    branches: ['main', 'feature/new-session', 'release'],
    currentBranch: 'main',
  });
});
