import type { PlanEntry } from '@repo/contracts';
import { withOccurrenceKeys } from '@repo/kit/occurrence-keys';
import { ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type { JSX } from 'react';
import { completedSteps } from '../../utils/status';
import { StepIndicator } from './plan-steps';
import { StatusSheetList } from './status-surface';

interface PlanSheetContentProps {
  entries: PlanEntry[];
}

// A phone's Plan sheet: the steps sit in one grouped card, as Settings' rows, titled with how many are done.
export function PlanSheetContent({
  entries,
}: PlanSheetContentProps): JSX.Element {
  const title = `${completedSteps(entries)} of ${entries.length} done`;
  const steps = withOccurrenceKeys(entries, (entry) => entry.content);

  return (
    <StatusSheetList>
      <ListSection title={title}>{steps.map(planStepItem)}</ListSection>
    </StatusSheetList>
  );
}

interface KeyedStep {
  item: PlanEntry;
  key: string;
}

function planStepItem({ item: entry, key }: KeyedStep): JSX.Element {
  return (
    <ListItem
      key={key}
      title={entry.content}
      leading={<StepIndicator entry={entry} />}
      multiline
    />
  );
}
