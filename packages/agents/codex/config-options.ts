import type {
  ConfigOptionIcon,
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import type { AgentConfigValue } from '../src/agent-events';
import {
  changeValue as changeConfigValue,
  effortLevelName,
  hasEffortLevels,
} from '../src/config-options';
import type { Model, ReasoningEffort } from './protocol.gen';
export type { Model } from './protocol.gen';

const modeNames = {
  plan: 'Plan mode',
  default: 'Ask first',
  fullAccess: 'Full access',
};
type Mode = keyof typeof modeNames;
const modeDescriptions = {
  default: 'Asks before edits and commands',
  plan: 'Reads and plans, changes nothing',
  fullAccess: 'Runs without sandbox or permission requests.',
} satisfies Record<Mode, string>;
const modeMetadata = {
  default: { icon: 'ShieldWarning', tone: 'safe' },
  plan: { icon: 'MapTrifold', tone: 'planning' },
  fullAccess: { icon: 'WarningTriangle', tone: 'dangerous' },
} satisfies Record<
  Mode,
  NonNullable<SessionConfigOption['_meta']>['argo'] & { icon: ConfigOptionIcon }
>;
const isMode = (value: string): value is Mode => value in modeNames;

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
  const effort =
    model.supportedReasoningEfforts.find(
      (option): boolean => option.reasoningEffort === wanted.effort,
    )?.reasoningEffort ?? model.defaultReasoningEffort;
  const mode = Object.keys(modeNames)
    .filter(isMode)
    .find((mode): boolean => mode === wanted.mode);
  return { model: model.model, effort, mode: mode ?? 'default' };
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
  const levels =
    modelFor(models, values.model)?.supportedReasoningEfforts ?? [];
  const options: SessionConfigOption[] = [
    {
      type: 'select',
      configId: 'mode',
      name: 'Mode',
      category: 'mode',
      currentValue: values.mode,
      options: Object.keys(modeNames)
        .filter(isMode)
        .map((value): SessionConfigSelectOption => ({
          value,
          name: modeNames[value],
          description: modeDescriptions[value],
          _meta: { argo: modeMetadata[value] },
        })),
    },
    {
      type: 'select',
      configId: 'model',
      name: 'Model',
      category: 'model',
      currentValue: values.model,
      options: models.map((model): SessionConfigSelectOption => ({
        value: model.model,
        name: model.displayName,
        description: model.description,
        _meta: {
          argo: {
            supportsEffort: model.supportedReasoningEfforts.length > 0,
            supportedEffortLevels: model.supportedReasoningEfforts.map(
              (option): string => option.reasoningEffort,
            ),
            supportsImages: model.inputModalities.includes('image'),
            supportsPersonality: model.supportsPersonality,
          },
        },
      })),
    },
  ];
  if (!hasEffortLevels(levels)) return options;
  return [
    ...options,
    {
      type: 'select',
      configId: 'effort',
      name: 'Effort',
      category: 'thought_level',
      currentValue: values.effort,
      options: levels.map((option): SessionConfigSelectOption => ({
        value: option.reasoningEffort,
        name: effortLevelName(option.reasoningEffort),
        description: option.description,
      })),
    },
  ];
}
