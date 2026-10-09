import type { EffortLevel, ModelInfo } from '@anthropic-ai/claude-agent-sdk';
import type {
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import { effortLevelName, hasEffortLevels } from '../src/config-options';
import { DEFAULT_VALUE, type ConfigValues } from './config-values';
export function effortLevelsFor(model: ModelInfo | undefined): EffortLevel[] {
  if (!model) return [];
  return model.supportsEffort ? supportedEfforts(model) : [];
}
function supportedEfforts(model: ModelInfo): EffortLevel[] {
  return model.supportedEffortLevels ?? [];
}
export function effortConfigOptions(
  model: ModelInfo | undefined,
  effort: ConfigValues['effort'],
): SessionConfigOption[] {
  const levels = effortLevelsFor(model);
  if (!hasEffortLevels(levels)) return [];
  return [effortOption(levels, effort)];
}
function effortOption(
  levels: EffortLevel[],
  currentValue: ConfigValues['effort'],
): SessionConfigOption {
  return {
    type: 'select',
    configId: 'effort',
    name: 'Effort',
    category: 'thought_level',
    currentValue,
    options: effortChoices(levels),
  };
}

function effortChoice(value: EffortLevel): SessionConfigSelectOption {
  return { value, name: effortLevelName(value) };
}

function effortChoices(levels: EffortLevel[]): SessionConfigSelectOption[] {
  return [
    { value: DEFAULT_VALUE, name: 'Provider default' },
    ...levels.map(effortChoice),
  ];
}
