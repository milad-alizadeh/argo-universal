import type {
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import { newSessionCatalogs, recordedSessionOptions } from '@repo/mocks/app';
import {
  recordedFlat,
  recordedLevels,
  recordedMetadata,
} from './recorded-choices';

export type HeldAgent = (typeof newSessionCatalogs.bothAvailable)[number];

export interface HeldChoiceRange {
  model: SessionConfigOption | undefined;
  effort: SessionConfigOption | undefined;
  narrower: SessionConfigSelectOption | undefined;
  efforts: SessionConfigSelectOption[];
  offered: SessionConfigSelectOption[];
}

function selectChoices(
  agent: HeldAgent,
  category: string,
): SessionConfigSelectOption[] {
  return recordedFlat(
    recordedSessionOptions(agent.id).find(
      (entry) => entry.category === category && entry.type === 'select',
    ),
  );
}

interface RecordedOptions {
  model: SessionConfigOption | undefined;
  effort: SessionConfigOption | undefined;
  models: SessionConfigSelectOption[];
  efforts: SessionConfigSelectOption[];
}

function recordedOptions(agent: HeldAgent): RecordedOptions {
  const options = recordedSessionOptions(agent.id);

  return {
    model: options.find((option) => option.category === 'model'),
    effort: options.find((option) => option.category === 'thought_level'),
    models: selectChoices(agent, 'model'),
    efforts: selectChoices(agent, 'thought_level'),
  };
}

function levelsForChoice(
  choice: SessionConfigSelectOption | undefined,
): string[] {
  return recordedMetadata(choice)?.supportedEffortLevels ?? [];
}

function missesLevel(
  choice: SessionConfigSelectOption,
  level: string,
): boolean {
  return !recordedMetadata(choice)?.supportedEffortLevels?.includes(level);
}

function supportsEffort(choice: SessionConfigSelectOption): boolean {
  return Boolean(recordedMetadata(choice)?.supportsEffort);
}

function narrowerRange(
  choice: SessionConfigSelectOption,
  levels: string[],
): boolean {
  return (
    supportsEffort(choice) && levels.some((level) => missesLevel(choice, level))
  );
}

export function heldChoiceRange(agent: HeldAgent): HeldChoiceRange {
  const { model, effort, models, efforts } = recordedOptions(agent);
  const levels = recordedLevels(models, model?.currentValue) ?? [];
  const narrower = models.find((choice) => narrowerRange(choice, levels));

  return {
    model,
    effort,
    narrower,
    efforts,
    offered: efforts.filter((choice) => levels.includes(choice.value)),
  };
}

export function unsupportedSelection(
  range: HeldChoiceRange,
): SessionConfigSelectOption | undefined {
  const narrowerLevels = levelsForChoice(range.narrower);

  return range.offered.find(
    (choice) =>
      differsFromCurrent(choice, range.effort) &&
      !narrowerLevels.includes(choice.value),
  );
}

function differsFromCurrent(
  choice: SessionConfigSelectOption,
  effort: SessionConfigOption | undefined,
): boolean {
  return choice.value !== effort?.currentValue;
}

export function sliderSteps(
  offered: SessionConfigSelectOption[],
  current: number,
  target: number,
): SessionConfigSelectOption[] {
  return target > current
    ? offered.slice(current + 1, target + 1)
    : offered.slice(target, current).reverse();
}

export function effortFallback(
  range: HeldChoiceRange,
  selected: SessionConfigSelectOption,
): SessionConfigSelectOption | undefined {
  const narrowerLevels = levelsForChoice(range.narrower);

  const narrowerOffered = range.efforts.filter((choice) =>
    narrowerLevels.includes(choice.value),
  );

  return (
    narrowerOffered.findLast(
      (choice) =>
        range.efforts.indexOf(choice) < range.efforts.indexOf(selected),
    ) ?? narrowerOffered[Math.floor(narrowerOffered.length / 2)]
  );
}
