import type { ModelInfo } from '@anthropic-ai/claude-agent-sdk';
import type { SessionConfigOption } from '@repo/contracts';
import type { AgentConfigValue } from '../src/agent-events';
import { changeValue as changeConfigValue } from '../src/config-options';
import { modesFor, modeConfigOption } from './config-modes';
import { DEFAULT_VALUE, type ConfigValues } from './config-values';
import { effortLevelsFor, effortConfigOptions } from './effort-config';
import { findModel, modelConfigOption } from './model-config';
export { DEFAULT_VALUE, type ConfigValues } from './config-values';
type Wanted = Record<keyof ConfigValues, unknown>;
function allowedValues(models: ModelInfo[], wanted: Wanted): ConfigValues {
  const model =
    findModel(models, wanted.model) ?? findModel(models, DEFAULT_VALUE);
  return {
    mode: allowedMode(model, wanted.mode),
    model: modelValue(model),
    effort: allowedEffort(model, wanted.effort),
  };
}
function allowedMode(
  model: ModelInfo | undefined,
  wanted: unknown,
): ConfigValues['mode'] {
  return modesFor(model).find((mode): boolean => mode === wanted) ?? 'default';
}
function allowedEffort(
  model: ModelInfo | undefined,
  wanted: unknown,
): ConfigValues['effort'] {
  return (
    effortLevelsFor(model).find((level): boolean => level === wanted) ??
    DEFAULT_VALUE
  );
}
export function startingValues(
  models: ModelInfo[],
  saved: AgentConfigValue[],
): ConfigValues {
  const savedValue = (configId: string): string | boolean | undefined =>
    saved.find((option): boolean => option.configId === configId)?.value;
  return allowedValues(models, {
    mode: savedValue('mode'),
    model: savedValue('model'),
    effort: savedValue('effort'),
  });
}
export function changeValue(
  models: ModelInfo[],
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
  models: ModelInfo[],
  values: ConfigValues,
): SessionConfigOption[] {
  const model = findModel(models, values.model);
  return [
    modeConfigOption(model, values.mode),
    modelConfigOption(models, values.model),
    ...effortConfigOptions(model, values.effort),
  ];
}

function modelValue(model: ModelInfo | undefined): string {
  return model?.value ?? DEFAULT_VALUE;
}
