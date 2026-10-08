import {
  startingValues,
  toConfigOptions,
} from '../../../packages/agents/claude/config-options';
import type {
  SDKControlInitializeResponse,
  SDKControlResponse,
} from '../../../packages/agents/claude/messages';
import { recordedImagePrompt } from '../image';
import { readRecording, recordedFrames } from '../recording';

const initialization = recordedFrames<SDKControlResponse>(
  readRecording(
    fileURLToPath(
      new URL('./recordings/2.1.286/image-prompt.json', import.meta.url),
    ),
    'claude-cli',
  ).payload,
  'output',
).find((frame): boolean => frame.type === 'control_response');
const recordedModels =
  initialization?.response.subtype === 'success'
    ? (initialization.response.response as SDKControlInitializeResponse).models
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

import { fileURLToPath } from 'node:url';
