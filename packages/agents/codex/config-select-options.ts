import type {
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import {
  effortLevelName,
  hasEffortLevels,
  sharedModes,
} from '../src/config-options';
import type {
  Model,
  ReasoningEffort,
  ReasoningEffortOption,
} from './protocol.gen';
export const modes = {
  ...sharedModes,
  fullAccess: {
    name: 'Full access',
    description: 'Runs without sandbox or permission requests.',
    _meta: { argo: { icon: 'WarningTriangle', tone: 'dangerous' } },
  },
} satisfies Record<string, Omit<SessionConfigSelectOption, 'value'>>;
export const isMode = (value: string): value is keyof typeof modes =>
  value in modes;
export const modeOption = (
  currentValue: keyof typeof modes,
): SessionConfigOption => ({
  type: 'select',
  configId: 'mode',
  name: 'Mode',
  category: 'mode',
  currentValue,
  options: Object.keys(modes)
    .filter(isMode)
    .map((value): SessionConfigSelectOption => ({ value, ...modes[value] })),
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
