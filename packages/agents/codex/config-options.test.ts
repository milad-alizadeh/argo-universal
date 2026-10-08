import { expect, it } from 'vitest';
import { changeValue, startingValues, toConfigOptions } from './config-options';
import { response } from './mocks/models';

const savedModelId = 'gpt-5.6-luna';
const defaultModelId = 'gpt-6-astra';

const models = response.data;
it('offers the recorded models and the selected model’s effort choices', (): void => {
  const values = startingValues(models, [
    { configId: 'model', value: savedModelId },
    { configId: 'effort', value: 'high' },
  ]);
  expect(values).toEqual({
    model: savedModelId,
    effort: 'high',
    mode: 'default',
  });
  expect(toConfigOptions(models, values)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        configId: 'model',
        currentValue: savedModelId,
        options: expect.arrayContaining([
          expect.objectContaining({ value: defaultModelId }),
        ]),
      }),
      expect.objectContaining({
        configId: 'effort',
        currentValue: 'high',
        options: expect.arrayContaining([
          expect.objectContaining({ value: 'high', name: 'High' }),
        ]),
      }),
    ]),
  );
});
it('uses the catalog default when the saved model no longer exists and rejects an unoffered value', (): void => {
  const values = startingValues(models, [
    { configId: 'model', value: 'missing-model' },
    { configId: 'effort', value: 'unknown' },
  ]);
  expect(values).toEqual({
    model: defaultModelId,
    effort: 'medium',
    mode: 'default',
  });
  expect(
    changeValue(models, values, { configId: 'model', value: 'missing-model' }),
  ).toBeUndefined();
  expect(
    changeValue(models, values, { configId: 'effort', value: 'unknown' }),
  ).toBeUndefined();
});

it('marks Plan and dangerous modes and previews each model’s support flags', (): void => {
  const options = toConfigOptions(models, startingValues(models, []));
  expect(options).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        configId: 'mode',
        options: [
          {
            value: 'plan',
            name: 'Plan mode',
            description: 'Reads and plans, changes nothing',
            _meta: { argo: { icon: 'MapTrifold', tone: 'planning' } },
          },
          {
            value: 'default',
            name: 'Ask first',
            description: 'Asks before edits and commands',
            _meta: { argo: { icon: 'ShieldWarning', tone: 'safe' } },
          },
          {
            value: 'fullAccess',
            name: 'Full access',
            description: 'Runs without sandbox or permission requests.',
            _meta: { argo: { icon: 'WarningTriangle', tone: 'dangerous' } },
          },
        ],
      }),
      expect.objectContaining({
        configId: 'model',
        options: expect.arrayContaining([
          expect.objectContaining({
            value: defaultModelId,
            _meta: { argo: expect.objectContaining({ supportsEffort: true }) },
          }),
        ]),
      }),
    ]),
  );
});
