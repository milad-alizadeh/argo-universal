import type { PlanEntry } from '@repo/contracts';
import { withOccurrenceKeys } from '@repo/kit/occurrence-keys';
import { IconSlot } from '@repo/kit/primitives/content/icon';
import { Pill } from '@repo/kit/primitives/status/pill';
import { cn } from '@repo/kit/utils';
import type { JSX } from 'react';
import { View } from 'react-native';
import { completedSteps } from '../../utils/status';

interface PlanTriggerProps {
  entries: PlanEntry[];
  disabled: boolean;
  wide: boolean;
  expanded: boolean;
  toggle: () => void;
}

function PlanProgressMarks({
  entries,
}: Pick<PlanTriggerProps, 'entries'>): JSX.Element {
  return (
    <IconSlot>
      <View className="size-full flex-row items-center gap-0.5">
        {withOccurrenceKeys(entries, (entry) => entry.content).map(
          ({ item, key }) => (
            <PlanMark key={key} entry={item} />
          ),
        )}
      </View>
    </IconSlot>
  );
}

function PlanMark({ entry }: { entry: PlanEntry }): JSX.Element {
  return (
    <View
      className={cn(
        'h-1 min-w-0 flex-1 rounded-xs',
        entry.status === 'completed' ? 'bg-foreground' : 'bg-border',
      )}
    />
  );
}

export function createPlanTrigger(props: PlanTriggerProps): JSX.Element {
  return <Pill {...planPillProps(props)} />;
}

const planPillProps = (
  props: PlanTriggerProps,
): React.ComponentProps<typeof Pill> => ({
  variant: 'control',
  appearance: 'glass',
  accessibilityLabel: 'Plan',
  disabled: props.disabled,
  text: props.wide
    ? `Plan ${completedSteps(props.entries)}/${props.entries.length}`
    : 'Plan',
  leading: <PlanProgressMarks entries={props.entries} />,
  detail: planDetail(props),
  fill: props.wide,
  ...planExpansion(props),
});

function planDetail({ wide, entries }: PlanTriggerProps): string | undefined {
  return wide
    ? entries.find((entry) => entry.status === 'in_progress')?.content
    : undefined;
}

function planExpansion({
  wide,
  expanded,
  toggle,
}: PlanTriggerProps): Pick<
  React.ComponentProps<typeof Pill>,
  'onPress' | 'aria-expanded' | 'disclosure'
> {
  if (!wide) return {};

  return {
    onPress: toggle,
    'aria-expanded': expanded,
    disclosure: expanded ? 'up' : 'down',
  };
}
