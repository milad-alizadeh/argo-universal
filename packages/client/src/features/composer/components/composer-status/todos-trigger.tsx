import {
  countPlanSteps,
  startedPlanSteps,
  type PlanEntry,
} from '@repo/contracts';
import {
  Icon,
  IconSizeContext,
  IconSlot,
} from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { Chevron } from '@repo/kit/primitives/status/chevron';
import { PhonePill } from '@repo/kit/primitives/status/pill';
import { cn } from '@repo/kit/utils';
import type { JSX } from 'react';
import { Pressable, View } from 'react-native';

interface TodosTriggerProps {
  entries: PlanEntry[];
  disabled: boolean;
  wide: boolean;
  expanded: boolean;
  toggle: () => void;
}

function TodosIcon(): JSX.Element {
  return (
    <IconSlot>
      <Icon name="checklist" />
    </IconSlot>
  );
}

// A phone floats the checklist above the card as a pill; a wide window draws it as the tray's own row, never a pill.
export function createTodosTrigger(props: TodosTriggerProps): JSX.Element {
  return props.wide ? (
    <TodosRow {...props} />
  ) : (
    <PhonePill {...todosPillProps(props)}>
      <TodosIcon />
      <Text role="control">{todosProgressLabel(props.entries)}</Text>
    </PhonePill>
  );
}

const todosPillProps = (
  props: TodosTriggerProps,
): React.ComponentProps<typeof PhonePill> => ({
  accessibilityLabel: 'Todos',
  role: 'button',
  disabled: props.disabled,
});

const todosRowClass =
  'group w-full min-h-composer-tray-row flex-row items-center gap-1.5 pl-4 pr-3 rounded-t-2xl web:hover:bg-hover';

const todosRowPress = (
  props: TodosTriggerProps,
): React.ComponentProps<typeof Pressable> => ({
  role: 'button',
  accessibilityLabel: 'Todos',
  'aria-expanded': props.expanded,
  disabled: props.disabled,
  onPress: props.toggle,
  className: cn(todosRowClass, props.disabled && 'opacity-35'),
});

function TodosRow(props: TodosTriggerProps): JSX.Element {
  return (
    <Pressable {...todosRowPress(props)}>
      <IconSizeContext value={{ size: 'sm', fixed: true }}>
        <TodosIcon />
        <TodosRowWords {...props} />
        <Chevron direction={props.expanded ? 'down' : 'up'} />
      </IconSizeContext>
    </Pressable>
  );
}

function todosProgressLabel(entries: PlanEntry[]): string {
  return `${startedPlanSteps(countPlanSteps(entries))}/${entries.length}`;
}

function TodosRowWords({ entries }: TodosTriggerProps): JSX.Element {
  const current = entries.find((entry) => entry.status === 'in_progress');

  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
      <Text role="control" selectable={false}>
        {`Todos ${todosProgressLabel(entries)}`}
      </Text>
      {current && <TodosRowStep content={current.content} />}
    </View>
  );
}

// The step under way, cut short before it reaches the chevron at the row's end.
function TodosRowStep({ content }: { content: string }): JSX.Element {
  return (
    <View className="min-w-0 shrink">
      <Text role="control" tone="muted" numberOfLines={1} selectable={false}>
        {content}
      </Text>
    </View>
  );
}
