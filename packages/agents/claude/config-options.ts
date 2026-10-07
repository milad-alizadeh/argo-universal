import type {
  EffortLevel,
  ModelInfo,
  PermissionMode,
} from '@anthropic-ai/claude-agent-sdk';
import type { ConfigOptionIcon, SessionConfigOption } from '@repo/contracts';
import type { AgentConfigValue } from '../src/agent-events';

// The SDK names its modes only as a type, so this list and its names are ours; `dontAsk` is not offered.
const modeNames = {
  plan: 'Plan mode',
  default: 'Ask first',
  acceptEdits: 'Accept edits',
  auto: 'Auto',
  bypassPermissions: 'Bypass permissions',
} satisfies Partial<Record<PermissionMode, string>>;
type Mode = keyof typeof modeNames;
const modeDescriptions = {
  default: 'Asks before edits and commands',
  acceptEdits: 'Edits files without asking, asks before commands',
  plan: 'Reads and plans, changes nothing',
  auto: 'Automatically checks permissions for each action',
  bypassPermissions: 'Runs everything without asking',
} satisfies Record<Mode, string>;
const modeMetadata = {
  default: { icon: 'ShieldWarning', tone: 'safe' },
  acceptEdits: { icon: 'Pencil', tone: 'moderate' },
  plan: { icon: 'MapTrifold', tone: 'planning' },
  auto: { icon: 'Sparkles', tone: 'moderate' },
  bypassPermissions: { icon: 'WarningTriangle', tone: 'dangerous' },
} satisfies Record<
  Mode,
  NonNullable<SessionConfigOption['_meta']>['argo'] & { icon: ConfigOptionIcon }
>;

// `default` identifies the recommended model; supported effort defaults resolve to a concrete level.
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

const withoutModelPrefix = (model: ModelInfo, description: string) => {
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
    levels.find((level) => level === preferred) ??
    levels.find((level) => level === 'high') ??
    levels[0] ??
    DEFAULT_VALUE
  );
}

// The wanted values that the model allows; anything else falls back to the default.
function allowedValues(models: ModelInfo[], wanted: Wanted): ConfigValues {
  const model =
    findModel(models, wanted.model) ?? findModel(models, DEFAULT_VALUE);
  return {
    mode: modesFor(model).find((mode) => mode === wanted.mode) ?? 'default',
    model: model?.value ?? DEFAULT_VALUE,
    effort:
      effortLevelsFor(model).find((level) => level === wanted.effort) ??
      defaultEffort(model),
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
        description: modeDescriptions[mode],
        _meta: { argo: modeMetadata[mode] },
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
  if (levels.length === 0) return options;
  const effort: SessionConfigOption = {
    type: 'select',
    configId: 'effort',
    name: 'Effort',
    category: 'thought_level',
    currentValue:
      values.effort === DEFAULT_VALUE ? defaultEffort(model) : values.effort,
    options: levels.map((level) => ({ value: level, name: effortName(level) })),
  };
  return [...options, effort];
}
