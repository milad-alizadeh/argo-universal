import type { ModelInfo } from '@anthropic-ai/claude-agent-sdk';
import { describe, expect, it } from 'vitest';
import { changeValue, startingValues, toConfigOptions } from './config-options';

const models: ModelInfo[] = [
  {
    value: 'default',
    displayName: 'Default (recommended)',
    description: 'Opus 5.5 · Best for everyday, complex tasks',
    resolvedModel: 'claude-opus-5-5',
    supportsEffort: true,
    supportedEffortLevels: ['low', 'medium', 'high', 'max'],
    supportsAutoMode: true,
  },
  { value: 'haiku', displayName: 'Haiku', description: 'Fastest' },
];

describe('Claude config options', (): void => {
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
      toConfigOptions(models, values ?? expect.unreachable()).map(
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
    const model = options.find(
      (option): boolean => option.configId === 'model',
    );
    if (model?.type !== 'select') throw new Error('Missing model options');
    expect(model.options[0]).toHaveProperty(
      '_meta.argo.supportsFastMode',
      true,
    );
  });

  it.each([
    { configId: 'mode', value: 'dontAsk' },
    { configId: 'colour', value: 'blue' },
    { configId: 'mode', value: true },
  ])('refuses a value Argo did not offer: %o', (change): void => {
    expect(
      changeValue(
        models,
        { model: 'haiku', mode: 'default', effort: 'default' },
        change,
      ),
    ).toBeUndefined();
  });
});

it('marks Plan and dangerous modes and keeps per-model support flags', (): void => {
  const options = toConfigOptions(models, startingValues(models, []));
  expect(options).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        configId: 'mode',
        options: expect.arrayContaining([
          expect.objectContaining({
            value: 'plan',
            _meta: { argo: { icon: 'MapTrifold', tone: 'planning' } },
          }),
          expect.objectContaining({
            value: 'bypassPermissions',
            _meta: { argo: { icon: 'WarningTriangle', tone: 'dangerous' } },
          }),
        ]),
      }),
      expect.objectContaining({
        configId: 'model',
        options: expect.arrayContaining([
          expect.objectContaining({
            value: 'default',
            _meta: {
              argo: expect.objectContaining({
                supportsEffort: true,
                supportsAutoMode: true,
              }),
            },
          }),
          expect.objectContaining({
            value: 'haiku',
            _meta: {
              argo: expect.objectContaining({
                supportsEffort: false,
                supportsAutoMode: false,
              }),
            },
          }),
        ]),
      }),
    ]),
  );
});

it('resolves the CLI alias to a model name in the adapter', (): void => {
  const catalog = [
    {
      ...models[0],
      description: 'Opus 5.5 · Best for everyday, complex tasks',
    },
    models[1],
  ] as ModelInfo[];
  const model = toConfigOptions(catalog, startingValues(catalog, [])).find(
    (option): boolean => option.category === 'model',
  );
  expect(model).toMatchObject({
    options: [
      {
        value: 'default',
        name: 'Opus 5.5 (recommended)',
        description: 'Best for everyday, complex tasks',
        _meta: { argo: { shortName: 'Opus 5.5' } },
      },
      { value: 'haiku', _meta: { argo: { shortName: 'Haiku' } } },
    ],
  });
});

it.each([
  ['claude-opus-5-5', 'medium'],
  ['claude-sonnet-5-5', 'medium'],
  ['claude-opus-4-7', 'xhigh'],
  ['claude-opus-4-6', 'high'],
])('maps the default effort for %s to %s', (resolvedModel, effort): void => {
  const catalog = [
    {
      ...models[0],
      resolvedModel,
      description: '',
      supportedEffortLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
    },
  ] as ModelInfo[];
  const values = startingValues(catalog, [
    { configId: 'effort', value: 'default' },
  ]);
  expect(values.effort).toBe(effort);
  const option = toConfigOptions(catalog, values).find(
    (entry): boolean => entry.category === 'thought_level',
  );
  expect(option).toMatchObject({ currentValue: effort });
  if (option?.type !== 'select') throw new Error('Missing effort options');
  expect(option.options).not.toContainEqual({
    value: 'default',
    name: 'Default',
  });
});
