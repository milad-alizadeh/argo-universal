import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AgentInfo,
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import { newSessionCatalogs } from '@repo/mocks/app';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  draftConfiguration,
  rememberSessionConfiguration,
  savedChoicesQuery,
} from './session-configuration-preferences';

type SelectOption = Extract<SessionConfigOption, { type: 'select' }>;

const choicesOf = (option: SelectOption): SessionConfigSelectOption[] =>
  option.options.flatMap((entry) =>
    'groupId' in entry ? entry.options : [entry],
  );

const levelsOf = (choice: SessionConfigSelectOption): string[] =>
  choice._meta?.argo?.supportedEffortLevels ?? [];

// What these tests need from each recorded Agent; a recording that loses one fails here by name.
const catalogCases = newSessionCatalogs.bothAvailable.map((agent) => {
  const select = (category: string): SelectOption => {
    const option = agent.configOptions.find(
      (entry): entry is SelectOption =>
        entry.type === 'select' && entry.category === category,
    );
    if (!option)
      throw new Error(
        `Recorded catalog needs ${category} options for ${agent.label}.`,
      );
    return option;
  };
  const model = select('model');
  const effort = select('thought_level');
  const models = choicesOf(model);
  const defaultModel = models.find(
    (choice) => choice.value === model.currentValue,
  );
  // A model offering fewer levels than the default, though still the default effort.
  const narrower = models.find(
    (choice) =>
      choice._meta?.argo?.supportsEffort &&
      levelsOf(choice).includes(effort.currentValue) &&
      defaultModel &&
      levelsOf(defaultModel).some((level) => !levelsOf(choice).includes(level)),
  );
  const unsupported =
    defaultModel &&
    levelsOf(defaultModel).find(
      (level) => narrower && !levelsOf(narrower).includes(level),
    );
  const chosenEffort =
    narrower &&
    levelsOf(narrower).find((level) => level !== effort.currentValue);
  if (!narrower || !unsupported || !chosenEffort)
    throw new Error(
      `Recorded catalog needs a default effort and models with differing effort levels for ${agent.label}.`,
    );
  return {
    agent,
    model,
    effort,
    narrower,
    unsupported,
    chosenEffort,
    withoutEffort: models.find(
      (choice) => choice._meta?.argo?.supportsEffort === false,
    ),
  };
});
const withoutEffortCases = catalogCases.flatMap(({ withoutEffort, ...rest }) =>
  withoutEffort ? [{ ...rest, withoutEffort }] : [],
);
if (withoutEffortCases.length === 0)
  throw new Error('Recorded catalog needs a model without effort.');

const drafted = (
  agent: AgentInfo,
  saved: Parameters<typeof draftConfiguration>[1],
): { configId: string; value: string }[] =>
  draftConfiguration(agent, saved).map((option) => ({
    configId: option.configId,
    value: option.currentValue,
  }));

// The same Agent, whose models each offer only one effort level, which is not its default.
function restrictedEffort(agent: AgentInfo, level: string): typeof agent {
  const restricted = structuredClone(agent);
  const models = restricted.configOptions
    .filter(
      (option): option is SelectOption =>
        option.type === 'select' && option.category === 'model',
    )
    .flatMap(choicesOf);
  for (const choice of models)
    if (choice._meta?.argo?.supportsEffort)
      choice._meta.argo.supportedEffortLevels = [level];
  return restricted;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('draftConfiguration', () => {
  it.each(catalogCases)(
    'starts $agent.label from each saved choice the Agent still offers',
    ({ agent, model, effort, narrower, chosenEffort }) => {
      expect(
        drafted(agent, { model: narrower.value, thought_level: chosenEffort }),
      ).toEqual([
        { configId: model.configId, value: narrower.value },
        { configId: effort.configId, value: chosenEffort },
      ]);
    },
  );

  it.each(withoutEffortCases)(
    'leaves effort out for $agent.label on a model without effort',
    ({ agent, model, withoutEffort }) => {
      expect(
        drafted(agent, { model: withoutEffort.value, thought_level: 'high' }),
      ).toEqual([{ configId: model.configId, value: withoutEffort.value }]);
    },
  );

  it.each(catalogCases)(
    'falls back to the default effort when $agent.label saved a level the saved model lacks',
    ({ agent, model, effort, narrower, unsupported }) => {
      expect(
        drafted(agent, { model: narrower.value, thought_level: unsupported }),
      ).toEqual([
        { configId: model.configId, value: narrower.value },
        { configId: effort.configId, value: effort.currentValue },
      ]);
    },
  );

  it.each(catalogCases)(
    'falls back to the first offered level when $agent.label model lacks the default effort',
    ({ agent, model, effort, chosenEffort }) => {
      expect(drafted(restrictedEffort(agent, chosenEffort), {})).toEqual([
        { configId: model.configId, value: model.currentValue },
        { configId: effort.configId, value: chosenEffort },
      ]);
    },
  );
});

// Browser storage, which AsyncStorage uses on the web, held in memory.
function memoryStorage(): Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem' | 'clear'
> {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value) && undefined,
    removeItem: (key) => values.delete(key) && undefined,
    clear: () => values.clear(),
  };
}

// The Agent's options with a model and effort the Session accepted.
function accepted(
  agent: AgentInfo,
  choices: Record<string, string>,
): SessionConfigOption[] {
  return agent.configOptions.map((option) =>
    option.type === 'select' && option.category && choices[option.category]
      ? { ...option, currentValue: choices[option.category] ?? '' }
      : option,
  );
}

describe('rememberSessionConfiguration', () => {
  it.each(catalogCases)(
    'keeps the choice $agent.label accepted while an older read is still loading',
    async ({ agent, model, effort, narrower, chosenEffort }) => {
      vi.stubGlobal('window', { localStorage: memoryStorage() });
      const client = new QueryClient();
      const query = savedChoicesQuery(agent.agent);
      const olderRead = Promise.withResolvers<string | null>();
      const read = vi
        .spyOn(AsyncStorage, 'getItem')
        .mockReturnValue(olderRead.promise);
      const loading = client.fetchQuery(query).catch(() => null);
      await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(2));
      rememberSessionConfiguration(
        client,
        agent.agent,
        accepted(agent, { model: narrower.value, thought_level: chosenEffort }),
      );
      olderRead.resolve(null);
      await loading;
      expect(drafted(agent, client.getQueryData(query.queryKey) ?? {})).toEqual(
        [
          { configId: model.configId, value: narrower.value },
          { configId: effort.configId, value: chosenEffort },
        ],
      );
    },
  );

  it.each(catalogCases)(
    'saves the choice $agent.label accepted for the next App start',
    async ({ agent, narrower, chosenEffort }) => {
      vi.stubGlobal('window', { localStorage: memoryStorage() });
      rememberSessionConfiguration(
        new QueryClient(),
        agent.agent,
        accepted(agent, { model: narrower.value, thought_level: chosenEffort }),
      );
      await expect(
        new QueryClient().fetchQuery(savedChoicesQuery(agent.agent)),
      ).resolves.toEqual({
        model: narrower.value,
        thought_level: chosenEffort,
      });
    },
  );
});
