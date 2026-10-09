import type { ModelInfo } from '@anthropic-ai/claude-agent-sdk';
import { expect, it } from 'vitest';
import { startingValues, toConfigOptions } from './config-options';
import { requireModel } from './mocks/config-models';
it.each([
  ['claude-opus-5-5', 'default'],
  ['claude-sonnet-5-5', 'default'],
  ['claude-opus-4-7', 'default'],
  ['claude-opus-4-6', 'default'],
])(
  'leaves the provider effort untouched for %s (%s)',
  (resolvedModel, effort): void => {
    const catalog = [
      {
        ...requireModel(0),
        resolvedModel,
        description: '',
        supportedEffortLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
      },
    ] satisfies ModelInfo[];
    const values = startingValues(catalog, [
      { configId: 'effort', value: 'default' },
    ]);
    expect(values.effort).toBe(effort);
    const option = toConfigOptions(catalog, values).find(
      (entry): boolean => entry.category === 'thought_level',
    );
    expect(option).toMatchObject({ currentValue: effort });
    if (option?.type !== 'select') throw new Error('Missing effort options');
    expect(option.options).toContainEqual({
      value: 'default',
      name: 'Provider default',
    });
  },
);
