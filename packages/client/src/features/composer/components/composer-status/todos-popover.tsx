import {
  countPlanSteps,
  startedPlanSteps,
  type PlanEntry,
} from '@repo/contracts';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type { JSX } from 'react';
import { View } from 'react-native';
import { fullPercent } from '../../utils/status';
import { Meter } from './status-meter';
import { phoneSheet } from './status-surface';
import { TodoSteps } from './todo-steps';
import { TodosSheetContent } from './todos-sheet-content';

const todosHeadingProps = {
  role: 'heading',
  accessibilityRole: 'heading',
  'aria-level': 2,
} as const;

function TodosHeading(): JSX.Element {
  return (
    <View className="flex-row items-center gap-2">
      <Icon name="checklist" className="text-foreground" />
      <Text selectable={false} {...todosHeadingProps} className="select-none">
        Todos
      </Text>
    </View>
  );
}

interface TodosEntriesProps {
  entries: PlanEntry[];
}

function TodosProgress({ entries }: TodosEntriesProps): JSX.Element {
  const counts = countPlanSteps(entries);
  const started = startedPlanSteps(counts);

  return (
    <View className="flex-row items-center gap-2">
      <TodosProgressMeter started={started} total={entries.length} />
      <Text selectable={false} role="secondary" className="select-none">
        {started} of {entries.length}{' '}
        {counts.inProgress > 0 ? 'started' : 'done'}
      </Text>
    </View>
  );
}

function TodosPopoverHeading({ entries }: TodosEntriesProps): JSX.Element {
  return (
    <View className="px-4 py-3 gap-1.5">
      <TodosHeading />
      <SizeClass only="wide">
        <TodosProgress entries={entries} />
      </SizeClass>
    </View>
  );
}

function HeadedTodoSteps({ entries }: TodosEntriesProps): JSX.Element {
  return (
    <View>
      <TodosPopoverHeading entries={entries} />
      <TodoSteps entries={entries} />
    </View>
  );
}

// A web popover heads the steps (with the checklist's progress when wide); a native sheet carries its own title and draws the steps in a grouped card.
export function TodosPopoverContent({
  entries,
}: TodosEntriesProps): JSX.Element {
  if (phoneSheet) return <TodosSheetContent entries={entries} />;

  return <HeadedTodoSteps entries={entries} />;
}

function TodosProgressMeter({
  started,
  total,
}: {
  started: number;
  total: number;
}): JSX.Element {
  return (
    <View className="w-16">
      <Meter percent={(started / total) * fullPercent} className="h-1" />
    </View>
  );
}
