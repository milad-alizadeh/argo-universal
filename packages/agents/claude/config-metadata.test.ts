import type { ModelInfo } from '@anthropic-ai/claude-agent-sdk';
import { expect, it } from 'vitest';
import { changeValue, startingValues, toConfigOptions } from './config-options';
import { models, requireModel } from './mocks/config-models';
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
      ...requireModel(0),
      description: 'Opus 5.5 · Best for everyday, complex tasks',
    },
    requireModel(1),
  ] satisfies ModelInfo[];
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
