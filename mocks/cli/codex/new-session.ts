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
const models = recording.payload.data.filter((model) => {
  const key = JSON.stringify(
    model.supportedReasoningEfforts.map((effort) => effort.reasoningEffort),
  );
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
        startingValues(models, [{ configId: 'model', value: model.model }]),
      ),
    ),
    prompt: recordedImagePrompt,
  };
}
