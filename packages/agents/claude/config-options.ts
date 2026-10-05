import type {
  EffortLevel,
  ModelInfo,
  PermissionMode,
} from '@anthropic-ai/claude-agent-sdk';
import type { SessionConfigOption } from '@repo/contracts';
import type { AgentConfigValue } from '../src/agent-events';

// The SDK names its modes only as a type, so this list and its names are ours; `dontAsk` is not offered.
const modeNames = {
  default: 'Ask before edits',
  acceptEdits: 'Accept edits',
  plan: 'Plan',
  auto: 'Auto',
  bypassPermissions: 'Bypass permissions',
} satisfies Partial<Record<PermissionMode, string>>;
type Mode = keyof typeof modeNames;

// `default` leaves the choice to the CLI: its default model, or the model's default effort.
export const DEFAULT_VALUE = 'default';

export interface ConfigValues {
  mode: Mode;
  model: string;
  effort: EffortLevel | typeof DEFAULT_VALUE;
}
type Wanted = Record<keyof ConfigValues, unknown>;

const findModel = (models: ModelInfo[], value: unknown) =>
  models.find((model) => model.value === value);

// Models and their effort levels come from the CLI's model list.
const modesFor = (model: ModelInfo | undefined) =>
  (Object.keys(modeNames) as Mode[]).filter(
    (mode) => mode !== 'auto' || model?.supportsAutoMode,
  );
const effortLevelsFor = (model: ModelInfo | undefined) =>
  (model?.supportsEffort && model.supportedEffortLevels) || [];

// The wanted values that the model allows; anything else falls back to the default.
function allowedValues(models: ModelInfo[], wanted: Wanted): ConfigValues {
  const model = findModel(models, wanted.model);
  return {
    mode: modesFor(model).find((mode) => mode === wanted.mode) ?? 'default',
    model: model?.value ?? DEFAULT_VALUE,
    effort:
      effortLevelsFor(model).find((level) => level === wanted.effort) ??
      DEFAULT_VALUE,
  };
}

// The saved values the models still allow, else the defaults.
export function startingValues(
  models: ModelInfo[],
  saved: AgentConfigValue[],
): ConfigValues {
  const savedValue = (configId: string) =>
    saved.find((option) => option.configId === configId)?.value;
  return allowedValues(models, {
    mode: savedValue('mode'),
    model: savedValue('model'),
    effort: savedValue('effort'),
  });
}

// The values after the user picks one option, or undefined for a value that was not offered.
export function changeValue(
  models: ModelInfo[],
  values: ConfigValues,
  change: AgentConfigValue,
): ConfigValues | undefined {
  if (!(change.configId in values)) return undefined;
  const configId = change.configId as keyof ConfigValues;
  const next = allowedValues(models, { ...values, [configId]: change.value });
  return next[configId] === change.value ? next : undefined;
}

const effortName = (level: EffortLevel) =>
  level === 'xhigh'
    ? 'Extra high'
    : `${level.charAt(0).toUpperCase()}${level.slice(1)}`;

export function toConfigOptions(
  models: ModelInfo[],
  values: ConfigValues,
): SessionConfigOption[] {
  const model = findModel(models, values.model);
  const options: SessionConfigOption[] = [
    {
      type: 'select',
      configId: 'mode',
      name: 'Mode',
      category: 'mode',
      currentValue: values.mode,
      options: modesFor(model).map((mode) => ({
        value: mode,
        name: modeNames[mode],
      })),
    },
    {
      type: 'select',
      configId: 'model',
      name: 'Model',
      category: 'model',
      currentValue: values.model,
      options: models.map((option) => ({
        value: option.value,
        name: option.displayName,
        ...(option.description ? { description: option.description } : {}),
      })),
    },
  ];
  const levels = effortLevelsFor(model);
  if (levels.length === 0) return options;
  const effort: SessionConfigOption = {
    type: 'select',
    configId: 'effort',
    name: 'Effort',
    category: 'thought_level',
    currentValue: values.effort,
    options: [
      { value: DEFAULT_VALUE, name: 'Default' },
      ...levels.map((level) => ({ value: level, name: effortName(level) })),
    ],
  };
  return [...options, effort];
}
