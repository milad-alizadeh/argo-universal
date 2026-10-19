import type { PlanEntry } from '@repo/contracts';
import type { JSX } from 'react';
import { ScrollView, View } from 'react-native';
import { withOccurrenceKeys } from '#lib/generic/occurrence-keys';
import { cn } from '#lib/generic/utils';
import { Icon, IconSpinner } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import { maximumPlanStepsHeight } from '../../utils/status';
import { mutedTextClassName } from './status-surface';

interface StepProps {
  entry: PlanEntry;
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

// Done steps are muted; a phone mutes the pending ones too, as a wide window draws them at full strength.
const stepTextClassName: Record<PlanEntry['status'], string | undefined> = {
  completed: mutedTextClassName,
  pending: `${mutedTextClassName} wide:text-foreground`,
  in_progress: undefined,
  cancelled: undefined,
};

function StepText({ entry }: StepProps): JSX.Element {
  return (
    <Text
      selectable={false}
      role="body"
      className={cn(
        'select-none flex-1 min-w-0',
        stepTextClassName[entry.status],
      )}
    >
      {entry.content}
    </Text>
  );
}

// A wide window marks the running step with a tint.
function PlanStep({ entry }: StepProps): JSX.Element {
  const className = cn(
    'flex-row items-start px-4 wide:pl-1 wide:pr-0.5 py-2 gap-2.5 wide:gap-1.5',
    entry.status === 'in_progress' && 'wide:rounded-md wide:bg-foreground/5',
  );

  return (
    <View className={className}>
      <View className="h-6 wide-type:h-5 shrink-0 justify-center">
        <StepIndicator entry={entry} />
      </View>
      <StepText entry={entry} />
    </View>
  );
}

interface StepsListProps {
  entries: PlanEntry[];
}

function StepsList({ entries }: StepsListProps): JSX.Element {
  return (
    <View className="pb-1 wide:px-1 wide:pb-2">
      {withOccurrenceKeys(entries, (entry) => entry.content).map(
        ({ item: entry, key }) => (
          <PlanStep key={key} entry={entry} />
        ),
      )}
    </View>
  );
}

// A wide popover scrolls a long plan within its height; a phone's sheet scrolls itself.
export function PlanSteps({ entries }: StepsListProps): JSX.Element {
  const steps = <StepsList entries={entries} />;

  return (
    <SizeClass
      compact={steps}
      wide={
        <ScrollView style={{ maxHeight: maximumPlanStepsHeight }}>
          {steps}
        </ScrollView>
      }
    />
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
