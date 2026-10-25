import { describe, expect, it } from 'vitest';
import {
  effortSelection,
  hasOwnControl,
  isModelOption,
  startingCategory,
  startingRank,
} from './session-configuration';
import type {
  SessionConfigOption,
  SessionConfigSelectOption,
} from './set-config-option';

const levels = ['low', 'medium', 'high', 'max'];

const thoughtLevel = 'thought_level';

const modelId = 'model';

const noEffort = 'no-effort';

const someEffort = 'some-effort';

type Argo = NonNullable<SessionConfigSelectOption['_meta']>['argo'];

const choice = (value: string, argo?: Argo): SessionConfigSelectOption => ({
  value,
  name: value,
  _meta: { argo },
});

const select = (
  head: { configId: string; category?: string },
  currentValue: string,
  options: SessionConfigSelectOption[],
): SessionConfigOption => ({
  ...head,
  name: head.configId,
  type: 'select',
  currentValue,
  options,
});

const model = (current: string): SessionConfigOption =>
  select({ configId: modelId, category: modelId }, current, [
    choice('plain'),
    choice(noEffort, { supportsEffort: false }),
    choice(someEffort, { supportedEffortLevels: ['medium', 'high'] }),
  ]);

const effort = (current: string): SessionConfigOption =>
  select(
    { configId: 'effort', category: thoughtLevel },
    current,
    levels.map((value) => choice(value)),
  );

const offered = (current: string): string[] =>
  effortSelection([model(current), effort('high')]).choices.map(
    (entry) => entry.value,
  );

describe('classifying options', () => {
  it.each([
    {
      category: modelId,
      starting: modelId,
      rank: 0,
      isModel: true,
      ownControl: true,
    },
    {
      category: thoughtLevel,
      starting: thoughtLevel,
      rank: 1,
      isModel: false,
      ownControl: true,
    },
    {
      category: 'mode',
      starting: 'mode',
      rank: 2,
      isModel: false,
      ownControl: true,
    },
    { category: 'collaboration_mode', rank: 3, ownControl: true },
    { category: 'model_config', rank: 3, ownControl: false },
    { category: undefined, rank: 3, ownControl: false },
  ] as const)(
    'category $category',
    ({ category, starting, rank, isModel, ownControl }) => {
      const option = select(
        { configId: 'x', ...(category && { category }) },
        'x',
        [],
      );

      expect(startingCategory(option)).toBe(starting);
      expect(startingRank(option)).toBe(rank);
      expect(isModelOption(option)).toBe(isModel ?? false);
      expect(hasOwnControl(option)).toBe(ownControl);
    },
  );

  it('hides the custom Agent picker', () => {
    expect(hasOwnControl(select({ configId: 'agent' }, 'x', []))).toBe(true);
  });
});

describe('effort follows the model', () => {
  it.each([
    ['plain', levels],
    [noEffort, []],
    [someEffort, ['medium', 'high']],
  ])('model %s offers the levels it names', (current, expected) => {
    expect(offered(current)).toEqual(expected);
  });

  it.each([
    { current: 'plain', value: 'medium', selected: 'medium', fallback: false },
    { current: someEffort, value: 'low', selected: 'high', fallback: true },
    { current: someEffort, value: 'max', selected: 'high', fallback: true },
    {
      current: noEffort,
      value: 'high',
      selected: undefined,
      fallback: false,
    },
  ])(
    'model $current with effort $value shows $selected',
    ({ current, value, selected, fallback }) => {
      const result = effortSelection([model(current), effort(value)]);

      expect(result.selected?.value).toBe(selected);
      expect(result.fallback).toBe(fallback);
    },
  );

  it('has no effort without an effort option', () => {
    expect(effortSelection([model('plain')]).choices).toEqual([]);
  });
});
