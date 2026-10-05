import { readFileSync } from 'node:fs';
import {
  startingValues,
  toConfigOptions,
} from '../../../packages/agents/claude/config-options';
import { recordedImagePrompt } from '../image';

const recording: {
  payload: {
    output: {
      type: string;
      response?: {
        response: { models: Parameters<typeof toConfigOptions>[0] };
      };
    }[];
  };
} = JSON.parse(
  readFileSync(
    new URL('./recordings/2.1.286/image-prompt.json', import.meta.url),
    'utf8',
  ),
);
const recordedModels = recording.payload.output.find(
  (frame) => frame.type === 'control_response',
)?.response?.response.models;
if (!recordedModels) throw new Error('Image recording has no model catalog');
const efforts = new Set<string>();
const models = recordedModels.filter((model) => {
  const key = JSON.stringify(model.supportedEffortLevels ?? []);
  if (efforts.has(key)) return false;
  efforts.add(key);
  return true;
});

export function newSessionMock() {
  return {
    configOptions: toConfigOptions(models, startingValues(models, [])),
    configOptionsByModel: models.map((model) =>
      toConfigOptions(
        models,
        startingValues(models, [{ configId: 'model', value: model.value }]),
      ),
    ),
    prompt: recordedImagePrompt,
  };
}
