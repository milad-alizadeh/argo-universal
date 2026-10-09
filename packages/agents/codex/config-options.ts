import type { SessionConfigOption } from '@repo/contracts';
import type { AgentConfigValue } from '../src/agent-events';
import { changeValue as changeConfigValue } from '../src/config-options';
import {
  modeNames,
  isMode,
  modeOption,
  modelOption,
  effortOptions,
} from './config-select-options';
import type { Model, ReasoningEffort } from './protocol.gen';
export type { Model } from './protocol.gen';

export interface ConfigValues {
  model: string;
  effort: ReasoningEffort;
  mode: keyof typeof modeNames;
}
const modelFor = (models: Model[], value: unknown): Model | undefined =>
  models.find((model): boolean => model.model === value) ??
  models.find((model): boolean => model.isDefault) ??
  models[0];
function allowedValues(
  models: Model[],
  wanted: Record<string, unknown>,
): ConfigValues {
  const model = modelFor(models, wanted.model);
  if (!model) throw new Error('Codex offers no models.');
  const effort = allowedEffort(model, wanted.effort);
  const mode = Object.keys(modeNames)
    .filter(isMode)
    .find((mode): boolean => mode === wanted.mode);
  return { model: model.model, effort, mode: allowedMode(mode) };
}
export const startingValues = (
  models: Model[],
  saved: AgentConfigValue[],
): ConfigValues =>
  allowedValues(
    models,
    Object.fromEntries(
      saved.map((option): [string, string | boolean] => [
        option.configId,
        option.value,
      ]),
    ),
  );
export function changeValue(
  models: Model[],
  values: ConfigValues,
  change: AgentConfigValue,
): ConfigValues | undefined {
  return changeConfigValue(
    (wanted): ConfigValues => allowedValues(models, wanted),
    values,
    change,
  );
}

export function toConfigOptions(
  models: Model[],
  values: ConfigValues,
): SessionConfigOption[] {
  return [
    modeOption(values.mode),
    modelOption(models, values.model),
    ...effortOptions(modelFor(models, values.model), values.effort),
  ];
}
const allowedEffort = (model: Model, wanted: unknown): ReasoningEffort =>
  model.supportedReasoningEfforts.find(
    (option): boolean => option.reasoningEffort === wanted,
  )?.reasoningEffort ?? model.defaultReasoningEffort;
const allowedMode = (
  mode: keyof typeof modeNames | undefined,
): keyof typeof modeNames => mode ?? 'default';
