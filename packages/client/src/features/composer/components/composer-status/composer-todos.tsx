import type { PlanEntry } from '@repo/contracts';
import type { JSX } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useContentWide } from '#lib/product/content-layout';
import { useTodosReveal } from '../../hooks/use-todos-reveal';
import { ComposerPopover } from '../composer-popover/composer-popover';
import { phoneSheet } from './status-surface';
import { TodoSteps } from './todo-steps';
import { TodosPopoverContent } from './todos-popover';
import { createTodosTrigger } from './todos-trigger';

export interface ComposerTodosProps {
  // The Agent's live checklist; its completed steps fill the trigger's marks.
  entries: PlanEntry[];
  disabled: boolean;
}

type TodosReveal = ReturnType<typeof useTodosReveal>;

interface RevealedTodosProps {
  entries: PlanEntry[];
  reveal: TodosReveal;
}

function RevealedTodos({ entries, reveal }: RevealedTodosProps): JSX.Element {
  const revealProps = todosRevealProps(reveal);

  return (
    <Animated.View testID="composer-todo-steps" {...revealProps}>
      <MeasuredTodos {...{ entries, reveal }} />
    </Animated.View>
  );
}

interface PhoneTodosProps {
  entries: PlanEntry[];
  trigger: JSX.Element;
}

const phonePopoverProps = {
  label: 'Todos',
  width: 420,
  listContent: phoneSheet,
};

function PhoneTodos({ entries, trigger }: PhoneTodosProps): JSX.Element {
  return (
    <ComposerPopover {...phonePopoverProps} trigger={trigger}>
      {() => <TodosPopoverContent entries={entries} />}
    </ComposerPopover>
  );
}

export function StatusTodos(props: ComposerTodosProps): JSX.Element {
  const wide = useContentWide();
  const reveal = useTodosReveal();

  const expansionProps = {
    wide,
    expanded: reveal.expanded,
    toggle: reveal.toggle,
  };

  const trigger = createTodosTrigger({ ...props, ...expansionProps });
  const layoutProps = { entries: props.entries, wide, reveal, trigger };

  return <PlanLayout {...layoutProps} />;
}

function PlanLayout(
  props: RevealedTodosProps & PhoneTodosProps & { wide: boolean },
): JSX.Element {
  if (props.wide)
    return (
      <View>
        {props.trigger}
        <RevealedTodos entries={props.entries} reveal={props.reveal} />
      </View>
    );

  return <PhoneTodos entries={props.entries} trigger={props.trigger} />;
}

type TodosVisibility = {
  'aria-hidden': boolean;
  accessibilityElementsHidden: boolean;
  className: string;
  style: TodosReveal['style'];
};

function todosRevealProps(reveal: TodosReveal): TodosVisibility {
  return {
    'aria-hidden': !reveal.expanded,
    accessibilityElementsHidden: !reveal.expanded,
    className: reveal.expanded
      ? 'overflow-hidden pointer-events-auto'
      : 'overflow-hidden pointer-events-none',
    style: reveal.style,
  };
}

function MeasuredTodos({ entries, reveal }: RevealedTodosProps): JSX.Element {
  return (
    <View className="absolute top-0 left-0 right-0" onLayout={reveal.onLayout}>
      <TodoSteps entries={entries} />
    </View>
  );
}
