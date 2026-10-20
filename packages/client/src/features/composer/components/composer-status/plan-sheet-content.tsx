import type { PlanEntry } from '@repo/contracts';
import type { JSX } from 'react';
import { View } from 'react-native';
import { withOccurrenceKeys } from '#lib/generic/occurrence-keys';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { completedSteps } from '../../utils/status';
import { StepIndicator } from './plan-steps';

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
    <View className="flex-1">
      <List appearance="grouped" fit>
        <ListSection title={title}>{steps.map(planStepItem)}</ListSection>
      </List>
    </View>
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
