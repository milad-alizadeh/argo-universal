import type { ModelInfo } from '@anthropic-ai/claude-agent-sdk';
import { expect, it } from 'vitest';
import { changeValue, startingValues, toConfigOptions } from './config-options';
import { models } from './mocks/config-models';
it('starts from the defaults and offers each model, mode and effort', (): void => {
  const values = startingValues(models, []);
  expect(values).toEqual({
    mode: 'default',
    model: 'default',
    effort: 'medium',
  });
  expect(toConfigOptions(models, values)).toMatchObject([
    {
      type: 'select',
      configId: 'mode',
      name: 'Mode',
      category: 'mode',
      currentValue: 'default',
      options: [
        { value: 'plan', name: 'Plan mode' },
        { value: 'default', name: 'Ask first' },
        { value: 'acceptEdits', name: 'Accept edits' },
        { value: 'auto', name: 'Auto' },
        { value: 'bypassPermissions', name: 'Bypass permissions' },
      ],
    },
    {
      type: 'select',
      configId: 'model',
      name: 'Model',
      category: 'model',
      currentValue: 'default',
      options: [
        { value: 'default', name: 'Opus 5.5 (recommended)' },
        { value: 'haiku', name: 'Haiku', description: 'Fastest' },
      ],
    },
    {
      type: 'select',
      configId: 'effort',
      name: 'Effort',
      category: 'thought_level',
      currentValue: 'medium',
      options: [
        { value: 'low', name: 'Low' },
        { value: 'medium', name: 'Medium' },
        { value: 'high', name: 'High' },
        { value: 'max', name: 'Max' },
      ],
    },
  ]);
});
it('keeps saved values the models still allow', (): void => {
  expect(
    startingValues(models, [
      { configId: 'model', value: 'default' },
      { configId: 'mode', value: 'auto' },
      { configId: 'effort', value: 'max' },
    ]),
  ).toEqual({ model: 'default', mode: 'auto', effort: 'max' });
  expect(
    startingValues(models, [
      { configId: 'model', value: 'retired-model' },
      { configId: 'mode', value: 'dontAsk' },
      { configId: 'effort', value: 'extreme' },
    ]),
  ).toEqual({ model: 'default', mode: 'default', effort: 'medium' });
});
it('drops auto mode and effort for a model without them', (): void => {
  const values = changeValue(
    models,
    { model: 'default', mode: 'auto', effort: 'high' },
    { configId: 'model', value: 'haiku' },
  );
  expect(values).toEqual({
    model: 'haiku',
    mode: 'default',
    effort: 'default',
  });
  expect(
    toConfigOptions(models, requireValues(values)).map(
      (option): string => option.configId,
    ),
  ).toEqual(['mode', 'model']);
});
it('preserves fast-mode capability metadata from the provider', (): void => {
  const catalog: ModelInfo[] = [
    {
      value: 'fast-capable',
      displayName: 'Fast-capable model',
      description: '',
      supportsFastMode: true,
    },
  ];
  const options = toConfigOptions(catalog, startingValues(catalog, []));
  const model = options.find((option): boolean => option.configId === 'model');
  if (model?.type !== 'select') throw new Error('Missing model options');
  expect(model.options[0]).toHaveProperty('_meta.argo.supportsFastMode', true);
});
function requireValues(
  values: ReturnType<typeof changeValue>,
): NonNullable<ReturnType<typeof changeValue>> {
  if (!values) throw new Error('Missing changed config values');
  return values;
}
