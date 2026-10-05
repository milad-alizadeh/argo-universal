import { describe, expect, it } from 'vitest';
import {
  changeValue,
  type ModelInfo,
  startingValues,
  toConfigOptions,
} from './config-options';

const models: ModelInfo[] = [
  {
    value: 'default',
    displayName: 'Default (recommended)',
    description: '',
    supportsEffort: true,
    supportedEffortLevels: ['low', 'high', 'max'],
    supportsAutoMode: true,
  },
  { value: 'haiku', displayName: 'Haiku', description: 'Fastest' },
];

describe('Claude config options', () => {
  it('starts from the defaults and offers each model, mode and effort', () => {
    const values = startingValues(models, []);
    expect(values).toEqual({
      mode: 'default',
      model: 'default',
      effort: 'default',
    });
    expect(toConfigOptions(models, values)).toEqual([
      {
        type: 'select',
        configId: 'mode',
        name: 'Mode',
        category: 'mode',
        currentValue: 'default',
        options: [
          { value: 'default', name: 'Ask before edits' },
          { value: 'acceptEdits', name: 'Accept edits' },
          { value: 'plan', name: 'Plan' },
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
          { value: 'default', name: 'Default (recommended)' },
          { value: 'haiku', name: 'Haiku', description: 'Fastest' },
        ],
      },
      {
        type: 'select',
        configId: 'effort',
        name: 'Effort',
        category: 'thought_level',
        currentValue: 'default',
        options: [
          { value: 'default', name: 'Default' },
          { value: 'low', name: 'Low' },
          { value: 'high', name: 'High' },
          { value: 'max', name: 'Max' },
        ],
      },
    ]);
  });

  it('keeps saved values the models still allow', () => {
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
    ).toEqual({ model: 'default', mode: 'default', effort: 'default' });
  });

  it('drops auto mode and effort for a model without them', () => {
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
      toConfigOptions(models, values ?? expect.unreachable()).map(
        (option) => option.configId,
      ),
    ).toEqual(['mode', 'model']);
  });

  it.each([
    { configId: 'mode', value: 'dontAsk' },
    { configId: 'colour', value: 'blue' },
    { configId: 'mode', value: true },
  ])('refuses a value Argo did not offer: %o', (change) => {
    expect(
      changeValue(
        models,
        { model: 'haiku', mode: 'default', effort: 'default' },
        change,
      ),
    ).toBeUndefined();
  });
});
