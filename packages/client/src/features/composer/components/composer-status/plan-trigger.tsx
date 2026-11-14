import type { PlanEntry } from '@repo/contracts';
import {
  Icon,
  IconSizeContext,
  IconSlot,
} from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { Chevron } from '@repo/kit/primitives/status/chevron';
import { Pill } from '@repo/kit/primitives/status/pill';
import { cn } from '@repo/kit/utils';
import type { JSX } from 'react';
import { Pressable, View } from 'react-native';
import { completedSteps } from '../../utils/status';

interface PlanTriggerProps {
  entries: PlanEntry[];
  disabled: boolean;
  wide: boolean;
  expanded: boolean;
  toggle: () => void;
}

function PlanIcon(): JSX.Element {
  return (
    <IconSlot>
      <Icon name="checklist" />
    </IconSlot>
  );
}

// A phone floats the Plan above the card as a pill; a wide window draws it as the tray's own row, never a pill.
export function createPlanTrigger(props: PlanTriggerProps): JSX.Element {
  return props.wide ? (
    <PlanRow {...props} />
  ) : (
    <Pill {...planPillProps(props)} />
  );
}

const planPillProps = (
  props: PlanTriggerProps,
): React.ComponentProps<typeof Pill> => ({
  variant: 'control',
  appearance: 'glass',
  accessibilityLabel: 'Plan',
  disabled: props.disabled,
  text: 'Plan',
  leading: <PlanIcon />,
});

const planRowClass =
  'group w-full min-h-7 flex-row items-center gap-1.5 pl-4 pr-3 rounded-t-2xl web:outline-none web:hover:bg-hover web:focus-visible:ring-2 web:focus-visible:ring-focus';

const planRowPress = (
  props: PlanTriggerProps,
): React.ComponentProps<typeof Pressable> => ({
  role: 'button',
  accessibilityLabel: 'Plan',
  'aria-expanded': props.expanded,
  disabled: props.disabled,
  onPress: props.toggle,
  className: cn(planRowClass, props.disabled && 'opacity-35'),
});

function PlanRow(props: PlanTriggerProps): JSX.Element {
  return (
    <Pressable {...planRowPress(props)}>
      <IconSizeContext value={{ size: 'sm', fixed: true }}>
        <PlanIcon />
        <PlanRowWords {...props} />
        <Chevron direction="up" />
      </IconSizeContext>
    </Pressable>
  );
}

function PlanRowWords({ entries }: PlanTriggerProps): JSX.Element {
  const current = entries.find((entry) => entry.status === 'in_progress');

  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
      <Text role="control" selectable={false}>
        {`Plan ${completedSteps(entries)}/${entries.length}`}
      </Text>
      {current && <PlanRowStep content={current.content} />}
    </View>
  );
}

// The step under way, cut short before it reaches the chevron at the row's end.
function PlanRowStep({ content }: { content: string }): JSX.Element {
  return (
    <View className="min-w-0 shrink">
      <Text role="control" tone="muted" numberOfLines={1} selectable={false}>
        {content}
      </Text>
    </View>
  );
}
