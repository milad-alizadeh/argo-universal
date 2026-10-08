import path from 'node:path';
import { expect, it } from 'vitest';
import { readRecording } from '../mocks/recording';
import { changeValue, startingValues, toConfigOptions } from './config-options';
import type { ModelListResponse } from './protocol.gen';

const recorded: { payload: ModelListResponse } = JSON.parse(
  readRecording(
    path.join(import.meta.dirname, '../../../mocks/cli/codex/recordings'),
    'model-list',
  ),
);
const models = recorded.payload.data;
it('offers the recorded models and the selected model’s effort choices', (): void => {
  const values = startingValues(models, [
    { configId: 'model', value: 'gpt-5.6-luna' },
    { configId: 'effort', value: 'high' },
  ]);
  expect(values).toEqual({
    model: 'gpt-5.6-luna',
    effort: 'high',
    mode: 'default',
  });
  expect(toConfigOptions(models, values)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        configId: 'model',
        currentValue: 'gpt-5.6-luna',
        options: expect.arrayContaining([
          expect.objectContaining({ value: 'gpt-6-astra' }),
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
    model: 'gpt-6-astra',
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
        options: expect.arrayContaining([
          expect.objectContaining({
            value: 'plan',
            _meta: { argo: { icon: 'MapTrifold', tone: 'planning' } },
          }),
          expect.objectContaining({
            value: 'fullAccess',
            _meta: { argo: { icon: 'WarningTriangle', tone: 'dangerous' } },
          }),
        ]),
      }),
      expect.objectContaining({
        configId: 'model',
        options: expect.arrayContaining([
          expect.objectContaining({
            value: 'gpt-6-astra',
            _meta: { argo: expect.objectContaining({ supportsEffort: true }) },
          }),
        ]),
      }),
    ]),
  );
});
