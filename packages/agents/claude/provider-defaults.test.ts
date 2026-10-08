import type { ModelInfo } from '@anthropic-ai/claude-agent-sdk';
import { expect, it } from 'vitest';
import { changeValue, startingValues, toConfigOptions } from './config-options';
const catalog = [
  {
    value: 'model-a',
    displayName: 'Available model',
    description: '',
    supportsEffort: true,
    supportedEffortLevels: ['low', 'high'],
  },
] satisfies ModelInfo[];
it('offers provider default without selecting the first catalog model', (): void => {
  const values = startingValues(catalog, []);
  expect(values).toEqual({
    model: 'default',
    mode: 'default',
    effort: 'default',
  });
  const option = toConfigOptions(catalog, values).find(
    (entry): boolean => entry.configId === 'model',
  );
  expect(option).toMatchObject({
    currentValue: 'default',
    options: [
      { value: 'default', name: 'Provider default' },
      { value: 'model-a', name: 'Available model' },
    ],
  });
});
it('keeps provider effort when explicitly selecting a model', (): void => {
  expect(
    changeValue(catalog, startingValues(catalog, []), {
      configId: 'model',
      value: 'model-a',
    }),
  ).toEqual({ model: 'model-a', mode: 'default', effort: 'default' });
});
it('uses provider effort for a saved choice absent from the catalog', (): void => {
  expect(
    startingValues(catalog, [
      { configId: 'model', value: 'model-a' },
      { configId: 'effort', value: 'medium' },
    ]),
  ).toEqual({ model: 'model-a', mode: 'default', effort: 'default' });
});
