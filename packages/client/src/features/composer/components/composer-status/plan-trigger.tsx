import type { PlanEntry } from '@repo/contracts';
import type { JSX } from 'react';
import { View } from 'react-native';
import { withOccurrenceKeys } from '#lib/generic/occurrence-keys';
import { cn } from '#lib/generic/utils';
import { contentActionClass } from '#primitives/actions/button';
import { Pressable } from '#primitives/actions/pressable';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { completedSteps } from '../../utils/status';
import { chipClassName, unselectableTextClassName } from './status-surface';

interface PlanTriggerProps {
  entries: PlanEntry[];
  disabled: boolean;
  wide: boolean;
  expanded: boolean;
  toggle: () => void;
}

interface PlanEntriesProps {
  entries: PlanEntry[];
  wide: boolean;
}

interface PlanMarkProps {
  entry: PlanEntry;
  wide: boolean;
}

function PlanProgressMark({ entry, wide }: PlanMarkProps): JSX.Element {
  return (
    <View
      className={cn(
        'h-1 rounded-xs bg-border',
        wide ? 'w-3.5' : 'w-1.5',
        entry.status === 'completed' && 'bg-foreground',
      )}
    />
  );
}

function PlanProgressMarks({ entries, wide }: PlanEntriesProps): JSX.Element {
  return (
    <View className="flex-row gap-0.5">
      {withOccurrenceKeys(entries, (entry) => entry.content).map(
        ({ item: entry, key }) => (
          <PlanProgressMark key={key} entry={entry} wide={wide} />
        ),
      )}
    </View>
  );
}

interface CurrentStepProps {
  entries: PlanEntry[];
  expanded: boolean;
}

function CurrentPlanStep({ entries, expanded }: CurrentStepProps): JSX.Element {
  const className = cn(
    'text-muted-foreground web:transition-transform web:duration-200',
    !expanded && 'rotate-180',
  );

  return (
    <>
      <CurrentStepLabel entries={entries} />
      <Icon role="chevron" name="chevron-up" className={className} />
    </>
  );
}

function PlanTriggerLabel({ entries, wide }: PlanEntriesProps): JSX.Element {
  return (
    <Text
      selectable={false}
      role={wide ? 'secondary' : 'badge'}
      className={unselectableTextClassName}
    >
      {wide ? `Plan ${completedSteps(entries)}/${entries.length}` : 'Plan'}
    </Text>
  );
}

function PlanTriggerContent({
  entries,
  wide,
  expanded,
}: Pick<PlanTriggerProps, 'entries' | 'wide' | 'expanded'>): JSX.Element {
  return (
    <>
      <PlanProgressMarks entries={entries} wide={wide} />
      <PlanTriggerLabel entries={entries} wide={wide} />
      {wide && <CurrentPlanStep entries={entries} expanded={expanded} />}
    </>
  );
}

export function createPlanTrigger(props: PlanTriggerProps): JSX.Element {
  const className = planTriggerClass(props);

  const pressableProps = {
    disabled: props.disabled,
    accessibilityLabel: 'Plan',
    ...planExpansionProps(props),
    className,
  };

  return (
    <Pressable {...pressableProps} role="button">
      <PlanTriggerContent {...props} />
    </Pressable>
  );
}

const currentStepTextProps = {
  selectable: false,
  numberOfLines: 1,
  role: 'secondary',
  className: 'select-none flex-1 min-w-0 text-foreground',
} as const;

function CurrentStepLabel({ entries }: { entries: PlanEntry[] }): JSX.Element {
  return (
    <Text {...currentStepTextProps}>
      {entries.find((entry) => entry.status === 'in_progress')?.content}
    </Text>
  );
}

function planTriggerClass({
  wide,
  disabled,
}: Pick<PlanTriggerProps, 'wide' | 'disabled'>): string {
  return contentActionClass({
    variant: 'ghost',
    className: wide
      ? 'h-8 sm:h-8 py-0 w-full px-3 gap-1.5 rounded-none justify-start'
      : chipClassName,
    disabled,
  });
}

interface PlanExpansionProps {
  accessibilityState: { expanded: boolean | undefined };
  'aria-expanded': boolean | undefined;
  onPress: (() => void) | undefined;
}

function planExpansionProps(
  props: Pick<PlanTriggerProps, 'wide' | 'expanded' | 'toggle'>,
): PlanExpansionProps {
  const { wide, expanded, toggle } = props;
  const revealed = wide ? expanded : undefined;

  return {
    accessibilityState: { expanded: revealed },
    'aria-expanded': revealed,
    onPress: wide ? toggle : undefined,
  };
}
