import type {
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import { newSessionCatalogs } from '@repo/mocks/app';
import {
  effortFallback,
  heldChoiceRange,
  sliderSteps,
  unsupportedSelection,
  type HeldAgent,
  type HeldChoiceRange,
} from './held-choice-ranges';

const missingHeldRangeMessage =
  'Recorded catalog needs two model effort ranges and an effort outside the narrower range.';

interface HeldChoiceCase {
  agent: HeldAgent;
  model: SessionConfigOption;
  effort: SessionConfigOption;
  narrower: SessionConfigSelectOption;
  selected: SessionConfigSelectOption;
  fallback: SessionConfigSelectOption;
  steps: SessionConfigSelectOption[];
  offered: SessionConfigSelectOption[];
}

function requiredChoice<Choice>(choice: Choice | undefined): Choice {
  if (choice === undefined) throw new Error(missingHeldRangeMessage);

  return choice;
}

function requiredSteps(
  range: HeldChoiceRange,
  selected: SessionConfigSelectOption,
): SessionConfigSelectOption[] {
  const current = range.offered.findIndex(
    (choice) => choice.value === range.effort?.currentValue,
  );

  const target = range.offered.indexOf(selected);
  const steps = sliderSteps(range.offered, current, target);

  if (current < 0 || steps.length === 0)
    throw new Error(missingHeldRangeMessage);

  return steps;
}

function heldChoiceCase(agent: HeldAgent): HeldChoiceCase {
  const range = heldChoiceRange(agent);
  const selected = requiredChoice(unsupportedSelection(range));

  return {
    agent,
    model: requiredChoice(range.model),
    effort: requiredChoice(range.effort),
    narrower: requiredChoice(range.narrower),
    selected,
    fallback: requiredChoice(effortFallback(range, selected)),
    steps: requiredSteps(range, selected),
    offered: range.offered,
  };
}

export const heldChoiceCases =
  newSessionCatalogs.bothAvailable.map(heldChoiceCase);
