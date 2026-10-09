import {
  AgentsListOutput,
  SessionNewInput,
  ProjectsBranchesOutput,
} from '@repo/contracts';
import {
  dangerousModeOptions,
  newSessionBranches,
  newSessionCatalogs,
  newSessionInputs,
  newSessionOptions,
} from '@repo/mocks/app';
import { expect, it } from 'vitest';

it.each(Object.entries(newSessionCatalogs))(
  'validates the %s New Session catalog mock',
  (_, catalog): void => {
    expect(AgentsListOutput.parse(catalog)).toEqual(catalog);
  },
);

it.each(newSessionInputs)(
  'validates the recorded image prompt for $agent',
  (newSessionInput): void => {
    expect(SessionNewInput.parse(newSessionInput)).toEqual(newSessionInput);
    expect(newSessionInput.prompt).toContainEqual(
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

it('validates the branch mock against the public contract', (): void => {
  expect(ProjectsBranchesOutput.parse(newSessionBranches)).toEqual({
    branches: ['main', 'feature/new-session', 'release'],
    currentBranch: 'main',
  });
});
