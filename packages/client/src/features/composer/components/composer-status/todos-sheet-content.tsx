import { countPlanSteps, type PlanEntry } from '@repo/contracts';
import { withOccurrenceKeys } from '@repo/kit/occurrence-keys';
import { ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type { JSX } from 'react';
import { StatusSheetList } from './status-surface';
import { StepIndicator } from './todo-steps';

interface TodosSheetContentProps {
  entries: PlanEntry[];
}

// A phone's checklist sheet: the steps sit in one grouped card, as Settings' rows, titled with how many are done.
export function TodosSheetContent({
  entries,
}: TodosSheetContentProps): JSX.Element {
  const { done } = countPlanSteps(entries);
  const title = `${done} of ${entries.length} done`;
  const steps = withOccurrenceKeys(entries, (entry) => entry.content);

  return (
    <StatusSheetList>
      <ListSection title={title}>{steps.map(todoStepItem)}</ListSection>
    </StatusSheetList>
  );
}

interface KeyedStep {
  item: PlanEntry;
  key: string;
}

function todoStepItem({ item: entry, key }: KeyedStep): JSX.Element {
  return (
    <ListItem
      key={key}
      title={entry.content}
      leading={<StepIndicator entry={entry} />}
      multiline
    />
  );
}
