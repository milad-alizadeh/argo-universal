import type {
  EffortLevel,
  ModelInfo,
  PermissionMode,
} from '@anthropic-ai/claude-agent-sdk';
import type {
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import type { AgentConfigValue } from '../src/agent-events';
import {
  changeValue as changeConfigValue,
  effortLevelName,
  hasEffortLevels,
  sharedModes,
} from '../src/config-options';

// The SDK names its modes only as a type, so this list and its names are ours; `dontAsk` is not offered.
const modes = {
  ...sharedModes,
  acceptEdits: {
    name: 'Accept edits',
    description: 'Edits files without asking, asks before commands',
    _meta: { argo: { icon: 'Pencil', tone: 'moderate' } },
  },
  auto: {
    name: 'Auto',
    description: 'Automatically checks permissions for each action',
    _meta: { argo: { icon: 'Sparkles', tone: 'moderate' } },
  },
  bypassPermissions: {
    name: 'Bypass permissions',
    description: 'Runs everything without asking',
    _meta: { argo: { icon: 'WarningTriangle', tone: 'dangerous' } },
  },
} satisfies Partial<
  Record<PermissionMode, Omit<SessionConfigSelectOption, 'value'>>
>;
type Mode = keyof typeof modes;

// `default` identifies the recommended model; supported effort defaults resolve to a concrete level.
export const DEFAULT_VALUE = 'default';

export interface ConfigValues {
  mode: Mode;
  model: string;
  effort: EffortLevel | typeof DEFAULT_VALUE;
}
type Wanted = Record<keyof ConfigValues, unknown>;

const findModel = (
  models: ModelInfo[],
  value: unknown,
): ModelInfo | undefined =>
  models.find((model): boolean => model.value === value);

// Models and their effort levels come from the CLI's model list.
const modesFor = (model: ModelInfo | undefined): Mode[] =>
  Object.keys(modes)
    .filter((mode): mode is Mode => mode in modes)
    .filter(
      (mode): boolean | undefined => mode !== 'auto' || model?.supportsAutoMode,
    );
const effortLevelsFor = (model: ModelInfo | undefined): EffortLevel[] =>
  (model?.supportsEffort && model.supportedEffortLevels) || [];

function modelName(model: ModelInfo): string {
  if (model.value !== DEFAULT_VALUE) return model.displayName;
  if (model.description.includes(' · '))
    return model.description.split(' · ')[0]?.trim() || model.displayName;
  const resolved = model.resolvedModel?.match(
    /claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?/,
  );
  if (resolved)
    return `${resolved[1]?.charAt(0).toUpperCase()}${resolved[1]?.slice(1)} ${resolved[2]}${resolved[3] ? `.${resolved[3]}` : ''}`;
  return model.displayName.replace(/\s*\(recommended\)\s*$/i, '');
}

const withoutModelPrefix = (model: ModelInfo, description: string): string => {
  const prefix = `${modelName(model)} · `;
  return description.startsWith(prefix)
    ? description.slice(prefix.length)
    : description;
};

// Claude Code model-config: Opus/Sonnet 5.5 use medium, Opus 4.7 uses xhigh, others use high.
function defaultEffort(
  model: ModelInfo | undefined,
): EffortLevel | typeof DEFAULT_VALUE {
  const levels = effortLevelsFor(model);
  if (!model || levels.length === 0) return DEFAULT_VALUE;
  const name = `${model.resolvedModel ?? ''} ${modelName(model)}`
    .toLowerCase()
    .replaceAll('-', ' ');
  let preferred = 'high';
  if (/(?:opus|sonnet) 5[ .]5\b/.test(name)) preferred = 'medium';
  else if (/opus 4[ .]7\b/.test(name)) preferred = 'xhigh';
  return (
    levels.find((level): boolean => level === preferred) ??
    levels.find((level): level is 'high' => level === 'high') ??
    levels[0] ??
    DEFAULT_VALUE
  );
}

// The wanted values that the model allows; anything else falls back to the default.
function allowedValues(models: ModelInfo[], wanted: Wanted): ConfigValues {
  const model =
    findModel(models, wanted.model) ?? findModel(models, DEFAULT_VALUE);
  return {
    mode:
      modesFor(model).find((mode): boolean => mode === wanted.mode) ??
      'default',
    model: model?.value ?? DEFAULT_VALUE,
    effort:
      effortLevelsFor(model).find(
        (level): boolean => level === wanted.effort,
      ) ?? defaultEffort(model),
  };
}

// The saved values the models still allow, else the defaults.
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

// The values after the user picks one option, or undefined for a value that was not offered.
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
  const options: SessionConfigOption[] = [
    {
      type: 'select',
      configId: 'mode',
      name: 'Mode',
      category: 'mode',
      currentValue: values.mode,
      options: modesFor(model).map((mode): SessionConfigSelectOption => ({
        value: mode,
        ...modes[mode],
      })),
    },
    {
      type: 'select',
      configId: 'model',
      name: 'Model',
      category: 'model',
      currentValue: values.model,
      options: models.map((option): SessionConfigSelectOption => ({
        value: option.value,
        name:
          option.value === DEFAULT_VALUE
            ? `${modelName(option)} (recommended)`
            : modelName(option),
        _meta: {
          argo: {
            shortName: modelName(option),
            supportsEffort: option.supportsEffort ?? false,
            supportedEffortLevels: option.supportedEffortLevels ?? [],
            supportsAdaptiveThinking: option.supportsAdaptiveThinking ?? false,
            supportsFastMode: option.supportsFastMode ?? false,
            supportsAutoMode: option.supportsAutoMode ?? false,
          },
        },
        ...(option.description
          ? {
              description:
                option.value === DEFAULT_VALUE
                  ? withoutModelPrefix(option, option.description)
                  : option.description,
            }
          : {}),
      })),
    },
  ];
  const levels = effortLevelsFor(model);
  if (!hasEffortLevels(levels)) return options;
  const effort: SessionConfigOption = {
    type: 'select',
    configId: 'effort',
    name: 'Effort',
    category: 'thought_level',
    currentValue:
      values.effort === DEFAULT_VALUE ? defaultEffort(model) : values.effort,
    options: levels.map((level): SessionConfigSelectOption => ({
      value: level,
      name: effortLevelName(level),
    })),
  };
  return [...options, effort];
}
