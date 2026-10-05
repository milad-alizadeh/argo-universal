import type { EffortLevel, ModelInfo } from '@anthropic-ai/claude-agent-sdk';
import type { SessionConfigOption } from '@repo/contracts';
import { z } from 'zod';
import type { AgentConfigValue } from '../src/agent-events';

export type { ModelInfo };

// Checks a saved effort against the levels the SDK names.
const SavedEffortLevel = z.enum([
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] satisfies EffortLevel[]);

// The vendor's `PermissionMode` without `dontAsk`, which Argo does not offer.
const PermissionMode = z.enum([
  'default',
  'acceptEdits',
  'plan',
  'auto',
  'bypassPermissions',
]);
type PermissionMode = z.infer<typeof PermissionMode>;

const modeNames: Record<PermissionMode, string> = {
  default: 'Ask before edits',
  acceptEdits: 'Accept edits',
  plan: 'Plan',
  auto: 'Auto',
  bypassPermissions: 'Bypass permissions',
};

// `default` leaves the choice to the CLI: its default model, or the model's default effort.
export const DEFAULT_VALUE = 'default';

export interface ConfigValues {
  mode: PermissionMode;
  model: string;
  effort: EffortLevel | typeof DEFAULT_VALUE;
}

const findModel = (models: ModelInfo[], value: string) =>
  models.find((model) => model.value === value);

// The saved values, before the model list can check them.
export function savedValues(saved: AgentConfigValue[]): ConfigValues {
  const savedValue = (configId: string) =>
    saved.find((option) => option.configId === configId)?.value;
  return {
    mode: PermissionMode.catch('default').parse(savedValue('mode')),
    model: z.string().catch(DEFAULT_VALUE).parse(savedValue('model')),
    effort: SavedEffortLevel.or(z.literal(DEFAULT_VALUE))
      .catch(DEFAULT_VALUE)
      .parse(savedValue('effort')),
  };
}

// The values to start with: the saved ones the models still allow, else the defaults.
export function startingValues(
  models: ModelInfo[],
  saved: AgentConfigValue[],
): ConfigValues {
  const values = savedValues(saved);
  return allowedValues(models, {
    ...values,
    model: findModel(models, values.model) ? values.model : DEFAULT_VALUE,
  });
}

// Drops a mode or effort that the chosen model does not support.
function allowedValues(
  models: ModelInfo[],
  values: ConfigValues,
): ConfigValues {
  const model = findModel(models, values.model);
  return {
    ...values,
    mode:
      values.mode === 'auto' && !model?.supportsAutoMode
        ? 'default'
        : values.mode,
    effort:
      values.effort !== DEFAULT_VALUE &&
      !model?.supportedEffortLevels?.includes(values.effort)
        ? DEFAULT_VALUE
        : values.effort,
  };
}

export function toConfigOptions(
  models: ModelInfo[],
  values: ConfigValues,
): SessionConfigOption[] {
  const model = findModel(models, values.model);
  const modes = PermissionMode.options.filter(
    (mode) => mode !== 'auto' || model?.supportsAutoMode,
  );
  const options: SessionConfigOption[] = [
    {
      type: 'select',
      configId: 'mode',
      name: 'Mode',
      category: 'mode',
      currentValue: values.mode,
      options: modes.map((mode) => ({ value: mode, name: modeNames[mode] })),
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
  const levels = model?.supportsEffort ? model.supportedEffortLevels : [];
  if (!levels?.length) return options;
  return [
    ...options,
    {
      type: 'select',
      configId: 'effort',
      name: 'Effort',
      category: 'thought_level',
      currentValue: values.effort,
      options: [
        { value: DEFAULT_VALUE, name: 'Default' },
        ...levels.map((level) => ({
          value: level,
          name: level === 'xhigh' ? 'Extra high' : capitalise(level),
        })),
      ],
    },
  ];
}

const capitalise = (word: string) =>
  `${word.charAt(0).toUpperCase()}${word.slice(1)}`;

// The values after the user picks one option, or undefined for a value Argo did not offer.
export function changeValue(
  models: ModelInfo[],
  values: ConfigValues,
  change: AgentConfigValue,
): ConfigValues | undefined {
  const offered = toConfigOptions(models, values).find(
    (option) => option.configId === change.configId,
  );
  if (offered?.type !== 'select' || typeof change.value !== 'string')
    return undefined;
  const choices = offered.options.flatMap((option) =>
    'value' in option ? [option.value] : [],
  );
  if (!choices.includes(change.value)) return undefined;
  return allowedValues(models, { ...values, [change.configId]: change.value });
}
