import type { EffortLevel, ModelInfo } from '@anthropic-ai/claude-agent-sdk';
import type {
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import { effortLevelName, hasEffortLevels } from '../src/config-options';
import { DEFAULT_VALUE, type ConfigValues } from './config-values';
import { modelName } from './model-config';
export function effortLevelsFor(model: ModelInfo | undefined): EffortLevel[] {
  if (!model) return [];
  return model.supportsEffort ? supportedEfforts(model) : [];
}
function supportedEfforts(model: ModelInfo): EffortLevel[] {
  return model.supportedEffortLevels ?? [];
}
export function defaultEffort(
  model: ModelInfo | undefined,
): ConfigValues['effort'] {
  if (!model) return DEFAULT_VALUE;
  const levels = effortLevelsFor(model);
  return (
    levels.find((level): boolean => level === preferredEffort(model)) ??
    fallbackEffort(levels)
  );
}
function fallbackEffort(levels: EffortLevel[]): ConfigValues['effort'] {
  return (
    levels.find((level): level is 'high' => level === 'high') ??
    levels[0] ??
    DEFAULT_VALUE
  );
}
function preferredEffort(model: ModelInfo): EffortLevel {
  const name = effortModelName(model).toLowerCase().replaceAll('-', ' ');
  if (/(?:opus|sonnet) 5[ .]5\b/.test(name)) return 'medium';
  if (/opus 4[ .]7\b/.test(name)) return 'xhigh';
  return 'high';
}
export function effortConfigOptions(
  model: ModelInfo | undefined,
  effort: ConfigValues['effort'],
): SessionConfigOption[] {
  const levels = effortLevelsFor(model);
  if (!hasEffortLevels(levels)) return [];
  return [
    effortOption(
      levels,
      effort === DEFAULT_VALUE ? defaultEffort(model) : effort,
    ),
  ];
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
    options: levels.map(effortChoice),
  };
}

function effortModelName(model: ModelInfo): string {
  return `${model.resolvedModel ?? ''} ${modelName(model)}`;
}

function effortChoice(value: EffortLevel): SessionConfigSelectOption {
  return { value, name: effortLevelName(value) };
}
