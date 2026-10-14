import type { PlanEntry } from '@repo/contracts';
import type { JSX } from 'react';
import { ScrollView, View } from 'react-native';
import { withOccurrenceKeys } from '#lib/generic/occurrence-keys';
import { cn } from '#lib/generic/utils';
import { Icon, IconSpinner } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { maximumPlanStepsHeight } from '../../state/status';
import { mutedTextClassName } from './status-surface';

interface StepProps {
  entry: PlanEntry;
  wide: boolean;
}

const spinnerProps = {
  accessible: true,
  role: 'progressbar',
  iconRole: 'control',
  colorClassName: 'accent-muted-foreground wide:accent-foreground',
} as const;

function StepIndicator({ entry }: { entry: PlanEntry }): JSX.Element {
  if (entry.status === 'in_progress')
    return (
      <IconSpinner
        {...spinnerProps}
        accessibilityLabel={`${entry.content} in progress`}
      />
    );

  return <IdleStepIndicator completed={entry.status === 'completed'} />;
}

function isStepMuted({ entry, wide }: StepProps): boolean {
  return entry.status === 'completed' || (!wide && entry.status === 'pending');
}

function StepText({ entry, wide }: StepProps): JSX.Element {
  const muted = isStepMuted({ entry, wide });

  return (
    <Text
      selectable={false}
      role="body"
      className={cn('select-none flex-1 min-w-0', muted && mutedTextClassName)}
    >
      {entry.content}
    </Text>
  );
}

function PlanStep({ entry, wide }: StepProps): JSX.Element {
  const active = wide && entry.status === 'in_progress';

  const className = cn(
    'flex-row items-start px-4 wide:pl-1 wide:pr-0.5 py-2 gap-2.5 wide:gap-1.5',
    active && 'rounded-md bg-foreground/5',
  );

  return (
    <View className={className}>
      <View className="h-6 wide:h-5 shrink-0 justify-center">
        <StepIndicator entry={entry} />
      </View>
      <StepText entry={entry} wide={wide} />
    </View>
  );
}

interface StepsListProps {
  entries: PlanEntry[];
  wide: boolean;
}

function StepsList({ entries, wide }: StepsListProps): JSX.Element {
  return (
    <View className={wide ? 'px-1 pb-2' : 'pb-1'}>
      {withOccurrenceKeys(entries, (entry) => entry.content).map(
        ({ item: entry, key }) => (
          <PlanStep key={key} entry={entry} wide={wide} />
        ),
      )}
    </View>
  );
}

export function PlanSteps({ entries }: { entries: PlanEntry[] }): JSX.Element {
  const wide = useWide();
  const steps = <StepsList entries={entries} wide={wide} />;

  return wide ? (
    <ScrollView style={{ maxHeight: maximumPlanStepsHeight }}>
      {steps}
    </ScrollView>
  ) : (
    steps
  );
}

function IdleStepIndicator({ completed }: { completed: boolean }): JSX.Element {
  return completed ? (
    <Icon role="control" name="check" className={mutedTextClassName} />
  ) : (
    <Icon
      role="control"
      name="pending"
      className="text-focus wide:text-muted-foreground"
    />
  );
}
