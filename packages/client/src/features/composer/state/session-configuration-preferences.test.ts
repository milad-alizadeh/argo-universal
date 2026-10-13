import type {} from '@repo/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  catalogCases,
  withoutEffortCases,
  drafted,
  restrictedEffort,
} from '../../../../mocks/composer-preference-mock';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('draftConfiguration', () => {
  it.each(catalogCases)(
    'starts $agent.label from each saved choice the Agent still offers',
    ({ agent, model, effort, mode, otherMode, narrower, chosenEffort }) => {
      expect(
        drafted(agent, {
          model: narrower.value,
          thought_level: chosenEffort,
          mode: otherMode.value,
        }),
      ).toEqual([
        { configId: model.configId, value: narrower.value },
        { configId: effort.configId, value: chosenEffort },
        { configId: mode.configId, value: otherMode.value },
      ]);
    },
  );

  it.each(withoutEffortCases)(
    'leaves effort out for $agent.label on a model without effort',
    ({ agent, model, withoutEffort, defaultMode }) => {
      expect(
        drafted(agent, { model: withoutEffort.value, thought_level: 'high' }),
      ).toEqual([
        { configId: model.configId, value: withoutEffort.value },
        defaultMode,
      ]);
    },
  );

  it.each(catalogCases)(
    'falls back to the default effort when $agent.label saved a level the saved model lacks',
    ({ agent, model, effort, narrower, unsupported, defaultMode }) => {
      expect(
        drafted(agent, { model: narrower.value, thought_level: unsupported }),
      ).toEqual([
        { configId: model.configId, value: narrower.value },
        { configId: effort.configId, value: effort.currentValue },
        defaultMode,
      ]);
    },
  );

  it.each(catalogCases)(
    'falls back to the first offered level when $agent.label model lacks the default effort',
    ({ agent, model, effort, chosenEffort, defaultMode }) => {
      expect(drafted(restrictedEffort(agent, chosenEffort), {})).toEqual([
        { configId: model.configId, value: model.currentValue },
        { configId: effort.configId, value: chosenEffort },
        defaultMode,
      ]);
    },
  );
});
