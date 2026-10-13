import type {} from '@repo/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  accepted,
  catalogCases,
  withoutEffortCases,
  drafted,
  restrictedEffort,
} from '../../../../mocks/composer-preference-mock';
import { nextRememberedChange } from './session-configuration-preferences';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('draftConfiguration', () => {
  it.each(catalogCases)(
    'starts $agent.agent from each saved choice the Agent still offers',
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
    'leaves effort out for $agent.agent on a model without effort',
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
    'falls back to the default effort when $agent.agent saved a level the saved model lacks',
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
    'falls back to the first offered level when $agent.agent model lacks the default effort',
    ({ agent, model, effort, chosenEffort, defaultMode }) => {
      expect(drafted(restrictedEffort(agent, chosenEffort), {})).toEqual([
        { configId: model.configId, value: model.currentValue },
        { configId: effort.configId, value: chosenEffort },
        defaultMode,
      ]);
    },
  );
});

describe('nextRememberedChange', () => {
  it.each(catalogCases)(
    'applies the saved model for $agent.agent before its effort',
    ({ agent, model, narrower, chosenEffort }) => {
      expect(
        nextRememberedChange(
          agent.configOptions,
          { model: narrower.value, thought_level: chosenEffort },
          [],
        ),
      ).toEqual({ configId: model.configId, value: narrower.value });
    },
  );

  it.each(catalogCases)(
    'applies the saved effort for $agent.agent once the Session runs the saved model',
    ({ agent, model, effort, narrower, chosenEffort }) => {
      expect(
        nextRememberedChange(
          accepted(agent, { model: narrower.value }),
          { model: narrower.value, thought_level: chosenEffort },
          [model.configId],
        ),
      ).toEqual({ configId: effort.configId, value: chosenEffort });
    },
  );

  it.each(catalogCases)(
    'changes nothing for $agent.agent when the Session already runs every saved choice',
    ({ agent, model, effort, mode }) => {
      expect(
        nextRememberedChange(
          agent.configOptions,
          {
            model: model.currentValue,
            thought_level: effort.currentValue,
            mode: mode.currentValue,
          },
          [],
        ),
      ).toBeUndefined();
    },
  );

  it.each(catalogCases)(
    'never applies an option for $agent.agent twice, even when the Session refused it',
    ({ agent, model, narrower }) => {
      expect(
        nextRememberedChange(agent.configOptions, { model: narrower.value }, [
          model.configId,
        ]),
      ).toBeUndefined();
    },
  );
});
