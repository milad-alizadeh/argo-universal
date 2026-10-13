import type {
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import { newSessionOptions } from '@repo/mocks/app';
import { composerUnlistedEffortConfigurations } from '../composer-mock';
import type { Configuration } from './common';
import { recordedFlat, recordedLevels } from './recorded-choices';
export const defaultEffortCases =
  composerUnlistedEffortConfigurations.map(defaultEffortCase);
function defaultEffortCase(
  configuration: Configuration,
  agentIndex: number,
): DefaultEffortCase {
  const recorded = newSessionOptions[agentIndex];
  const options = recorded?.configOptions ?? [];
  const model = options.find((entry) => entry.category === 'model');
  const option = recordedEffortOption(options);
  const offered = recordedOfferedEfforts(model, option);
  return {
    configuration,
    selected: requiredEffortSelection(offered),
    configId: option.configId,
  };
}
function recordedOfferedEfforts(
  model: SessionConfigOption | undefined,
  option: SessionConfigOption,
): SessionConfigSelectOption[] {
  const supported = recordedLevels(recordedFlat(model), model?.currentValue);
  return recordedFlat(option).filter(
    (entry) => !supported || supported.includes(entry.value),
  );
}
export interface DefaultEffortCase {
  configuration: Configuration;
  selected: SessionConfigSelectOption;
  configId: string;
}
function requiredEffortOption(
  option?: SessionConfigOption,
): SessionConfigOption {
  if (!option) throw new Error(defaultEffortRequirements);
  return option;
}
function requiredEffortSelection(
  offered: SessionConfigSelectOption[],
): SessionConfigSelectOption {
  const selected = offered[Math.floor(offered.length / 2)];
  if (!selected) throw new Error(defaultEffortRequirements);
  if (offered.length < 2) throw new Error(defaultEffortRequirements);
  return selected;
}
const defaultEffortRequirements =
  'Recorded catalog needs at least two effort levels for every Agent.';

function recordedEffortOption(
  options: SessionConfigOption[],
): SessionConfigOption {
  return requiredEffortOption(
    options.find(
      (entry) => entry.category === 'thought_level' && entry.type === 'select',
    ),
  );
}
