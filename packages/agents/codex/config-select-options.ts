import type {
  ConfigOptionIcon,
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import { effortLevelName, hasEffortLevels } from '../src/config-options';
import type {
  Model,
  ReasoningEffort,
  ReasoningEffortOption,
} from './protocol.gen';
export const modeNames = {
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
export const isMode = (value: string): value is Mode => value in modeNames;

export const modeOption = (
  currentValue: keyof typeof modeNames,
): SessionConfigOption => ({
  type: 'select',
  configId: 'mode',
  name: 'Mode',
  category: 'mode',
  currentValue,
  options: Object.keys(modeNames).filter(isMode).map(modeChoice),
});
const modelMetadata = (model: Model): SessionConfigSelectOption['_meta'] => ({
  argo: {
    supportsEffort: model.supportedReasoningEfforts.length > 0,
    supportedEffortLevels: model.supportedReasoningEfforts.map(
      (option): string => option.reasoningEffort,
    ),
    supportsImages: model.inputModalities.includes('image'),
    supportsPersonality: model.supportsPersonality,
  },
});
const modelChoice = (model: Model): SessionConfigSelectOption => ({
  value: model.model,
  name: model.displayName,
  description: model.description,
  _meta: modelMetadata(model),
});
export const modelOption = (
  models: Model[],
  currentValue: string,
): SessionConfigOption => ({
  type: 'select',
  configId: 'model',
  name: 'Model',
  category: 'model',
  currentValue,
  options: models.map(modelChoice),
});
const effortChoice = (
  option: ReasoningEffortOption,
): SessionConfigSelectOption => ({
  value: option.reasoningEffort,
  name: effortLevelName(option.reasoningEffort),
  description: option.description,
});
export const effortOptions = (
  model: Model | undefined,
  currentValue: ReasoningEffort,
): SessionConfigOption[] => {
  const levels = effortLevels(model);
  if (!hasEffortLevels(levels)) return [];
  return [effortOption(levels, currentValue)];
};
const effortLevels = (
  model: Model | undefined,
): Model['supportedReasoningEfforts'] => model?.supportedReasoningEfforts ?? [];
const effortOption = (
  levels: Model['supportedReasoningEfforts'],
  currentValue: ReasoningEffort,
): SessionConfigOption => ({
  type: 'select',
  configId: 'effort',
  name: 'Effort',
  category: 'thought_level',
  currentValue,
  options: levels.map(effortChoice),
});

const modeChoice = (value: Mode): SessionConfigSelectOption => ({
  value,
  name: modeNames[value],
  description: modeDescriptions[value],
  _meta: { argo: modeMetadata[value] },
});
