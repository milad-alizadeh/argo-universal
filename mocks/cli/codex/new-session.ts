import path from 'node:path';
import {
  startingValues,
  toConfigOptions,
} from '../../../packages/agents/codex/config-options';
import { isModelListResponse } from '../../../packages/agents/codex/payloads';
import { recordedImagePrompt } from '../image';
import { findRecording, readRecording } from '../recording';

const modelsPayload = readRecording(
  findRecording(path.join(import.meta.dirname, 'recordings'), 'model-list'),
  'codex-app-server',
).payload;
if (!isModelListResponse(modelsPayload))
  throw new Error('Invalid recorded model catalog');
const recordedModels = modelsPayload.data;
const efforts = new Set<string>();
const models = recordedModels.filter((model): boolean => {
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
