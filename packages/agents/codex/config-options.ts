import type { ConfigOptionIcon, SessionConfigOption } from '@repo/contracts';
import type { AgentConfigValue } from '../src/agent-events';
import type { Model, ReasoningEffort } from './protocol.gen';

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
  const mode = Object.keys(modeNames).find(
    (mode): boolean => mode === wanted.mode,
  ) as ConfigValues['mode'] | undefined;
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
      options: Object.entries(modeNames).map(
        ([value, name]): {
          value: string;
          name: string;
          _meta: {
            argo: (typeof modeMetadata)[Mode];
          };
          description: string;
        } => ({
          value,
          name,
          _meta: { argo: modeMetadata[value as ConfigValues['mode']] },
          description: modeDescriptions[value as ConfigValues['mode']],
        }),
      ),
    },
    {
      type: 'select',
      configId: 'model',
      name: 'Model',
      category: 'model',
      currentValue: values.model,
      options: models.map(
        (
          model,
        ): {
          value: string;
          name: string;
          description: string;
          _meta: {
            argo: {
              supportsEffort: boolean;
              supportedEffortLevels: string[];
              supportsImages: boolean;
              supportsPersonality: boolean;
            };
          };
        } => ({
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
        }),
      ),
    },
    {
      type: 'select',
      configId: 'effort',
      name: 'Effort',
      category: 'thought_level',
      currentValue: values.effort,
      options: (
        modelFor(models, values.model)?.supportedReasoningEfforts ?? []
      ).map((option): { value: string; name: string; description: string } => ({
        value: option.reasoningEffort,
        name:
          option.reasoningEffort === 'xhigh'
            ? 'Extra high'
            : `${option.reasoningEffort.charAt(0).toUpperCase()}${option.reasoningEffort.slice(1)}`,
        description: option.description,
      })),
    },
  ];
}
