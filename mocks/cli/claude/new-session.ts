import path from 'node:path';
import {
  startingValues,
  toConfigOptions,
} from '../../../packages/agents/claude/config-options';
import {
  isWireFrame,
  isControlResponse,
  isInitializeResponse,
} from '../../../packages/agents/claude/control-payloads.ts';
import { recordedImagePrompt } from '../image';
import { findRecording, readRecording, recordedFrames } from '../recording';

const initialization = recordedFrames(
  readRecording(
    findRecording(path.join(import.meta.dirname, 'recordings'), 'image-prompt'),
    'claude-cli',
  ).payload,
  'output',
  isWireFrame,
).find(isControlResponse);
const recordedModels =
  initialization?.response.subtype === 'success' &&
  isInitializeResponse(initialization.response.response)
    ? initialization.response.response.models
    : undefined;
if (!recordedModels) throw new Error('Image recording has no model catalog');
const efforts = new Set<string>();
const models = recordedModels.filter((model): boolean => {
  const key = JSON.stringify(model.supportedEffortLevels ?? []);
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
          startingValues(models, [{ configId: 'model', value: model.value }]),
        ),
    ),
    prompt: recordedImagePrompt,
  };
}
