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
  const { option, offered } = recordedEfforts(agentIndex);
  const selected = requiredEffortSelection(offered);

  return {
    configuration,
    selected,
    position: offered.indexOf(selected),
    configId: option.configId,
  };
}

interface RecordedEfforts {
  option: SessionConfigOption;
  offered: SessionConfigSelectOption[];
}

// The recorded Agent's effort option and the levels its default model offers.
function recordedEfforts(agentIndex: number): RecordedEfforts {
  const options = newSessionOptions[agentIndex]?.configOptions ?? [];
  const model = options.find((entry) => entry.category === 'model');
  const option = recordedEffortOption(options);

  return { option, offered: recordedOfferedEfforts(model, option) };
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
  // The default level's place among the offered levels: the slider's value.
  position: number;
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
