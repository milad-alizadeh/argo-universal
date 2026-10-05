import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { changeValue, startingValues, toConfigOptions } from './config-options';
import type { ModelListResponse } from './protocol.gen';

const recorded: { payload: ModelListResponse } = JSON.parse(
  readFileSync(
    new URL(
      '../../../mocks/cli/codex/recordings/0.157.0/model-list.json',
      import.meta.url,
    ),
    'utf8',
  ),
);
const models = recorded.payload.data;
it('offers the recorded models and the selected model’s effort choices', () => {
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
          expect.objectContaining({ value: 'high' }),
        ]),
      }),
    ]),
  );
});
it('uses the catalog default when the saved model no longer exists and rejects an unoffered value', () => {
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
