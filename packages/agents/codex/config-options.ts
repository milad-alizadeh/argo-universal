import type { SessionConfigOption } from '@repo/contracts';
import type { AgentConfigValue } from '../src/agent-events';
import type { Model, ReasoningEffort } from './protocol.gen';

const modeNames = {
  default: 'Ask before edits',
  plan: 'Plan',
  fullAccess: 'Full access',
};
export interface ConfigValues {
  model: string;
  effort: ReasoningEffort;
  mode: keyof typeof modeNames;
}
const modelFor = (models: Model[], value: unknown) =>
  models.find((model) => model.model === value) ??
  models.find((model) => model.isDefault) ??
  models[0];
function allowedValues(
  models: Model[],
  wanted: Record<string, unknown>,
): ConfigValues {
  const model = modelFor(models, wanted.model);
  if (!model) throw new Error('Codex offers no models.');
  const effort =
    model.supportedReasoningEfforts.find(
      (option) => option.reasoningEffort === wanted.effort,
    )?.reasoningEffort ?? model.defaultReasoningEffort;
  const mode = Object.keys(modeNames).find((mode) => mode === wanted.mode) as
    | ConfigValues['mode']
    | undefined;
  return { model: model.model, effort, mode: mode ?? 'default' };
}
export const startingValues = (models: Model[], saved: AgentConfigValue[]) =>
  allowedValues(
    models,
    Object.fromEntries(saved.map((option) => [option.configId, option.value])),
  );
export function changeValue(
  models: Model[],
  values: ConfigValues,
  change: AgentConfigValue,
): ConfigValues | undefined {
  if (!(change.configId in values)) return undefined;
  const next = allowedValues(models, {
    ...values,
    [change.configId]: change.value,
  });
  return next[change.configId as keyof ConfigValues] === change.value
    ? next
    : undefined;
}
export function toConfigOptions(
  models: Model[],
  values: ConfigValues,
): SessionConfigOption[] {
  return [
    {
      type: 'select',
      configId: 'mode',
      name: 'Mode',
      category: 'mode',
      currentValue: values.mode,
      options: Object.entries(modeNames).map(([value, name]) => ({
        value,
        name,
        ...(value === 'fullAccess'
          ? { description: 'Runs without sandbox or permission requests.' }
          : {}),
      })),
    },
    {
      type: 'select',
      configId: 'model',
      name: 'Model',
      category: 'model',
      currentValue: values.model,
      options: models.map((model) => ({
        value: model.model,
        name: model.displayName,
        description: model.description,
      })),
    },
    {
      type: 'select',
      configId: 'effort',
      name: 'Effort',
      category: 'thought_level',
      currentValue: values.effort,
      options: (
        modelFor(models, values.model)?.supportedReasoningEfforts ?? []
      ).map((option) => ({
        value: option.reasoningEffort,
        name: option.reasoningEffort,
        description: option.description,
      })),
    },
  ];
}
