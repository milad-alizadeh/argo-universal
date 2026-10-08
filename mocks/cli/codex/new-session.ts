import { readFileSync } from 'node:fs';
import {
  startingValues,
  toConfigOptions,
} from '../../../packages/agents/codex/config-options';
import type { ModelListResponse } from '../../../packages/agents/codex/protocol.gen';
import { recordedImagePrompt } from '../image';

const recording: { payload: ModelListResponse } = JSON.parse(
  readFileSync(
    new URL('./recordings/0.157.0/model-list.json', import.meta.url),
    'utf8',
  ),
);
const efforts = new Set<string>();
const models = recording.payload.data.filter((model): boolean => {
  const key = JSON.stringify(
    model.supportedReasoningEfforts.map(
      (effort): string => effort.reasoningEffort,
    ),
  );
  if (efforts.has(key)) return false;
  efforts.add(key);
  return true;
});

type NewSessionMock = {
  configOptions: ReturnType<typeof toConfigOptions>;
  configOptionsByModel: ReturnType<typeof toConfigOptions>[];
  prompt: typeof recordedImagePrompt;
};

export function newSessionMock(): NewSessionMock {
  return {
    configOptions: toConfigOptions(models, startingValues(models, [])),
    configOptionsByModel: models.map(
      (model): ReturnType<typeof toConfigOptions> =>
        toConfigOptions(
          models,
          startingValues(models, [{ configId: 'model', value: model.model }]),
        ),
    ),
    prompt: recordedImagePrompt,
  };
}
