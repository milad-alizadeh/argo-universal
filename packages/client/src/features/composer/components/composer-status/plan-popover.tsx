import type { PlanEntry } from '@repo/contracts';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type { JSX } from 'react';
import { View } from 'react-native';
import { completedSteps, fullPercent } from '../../utils/status';
import { PlanSheetContent } from './plan-sheet-content';
import { PlanSteps } from './plan-steps';
import { Meter } from './status-meter';
import { phoneSheet } from './status-surface';

const planHeadingProps = {
  role: 'heading',
  accessibilityRole: 'heading',
  'aria-level': 2,
} as const;

function PlanHeading(): JSX.Element {
  return (
    <View className="flex-row items-center gap-2">
      <Icon role="control" name="checklist" className="text-foreground" />
      <Text selectable={false} {...planHeadingProps} className="select-none">
        Plan
      </Text>
    </View>
  );
}

interface PlanEntriesProps {
  entries: PlanEntry[];
}

function PlanCompletion({ entries }: PlanEntriesProps): JSX.Element {
  const done = completedSteps(entries);

  return (
    <View className="flex-row items-center gap-2">
      <PlanCompletionMeter done={done} total={entries.length} />
      <Text selectable={false} role="secondary" className="select-none">
        {done} of {entries.length} done
      </Text>
    </View>
  );
}

function PlanPopoverHeading({ entries }: PlanEntriesProps): JSX.Element {
  return (
    <View className="px-4 py-3 gap-1.5">
      <PlanHeading />
      <SizeClass only="wide">
        <PlanCompletion entries={entries} />
      </SizeClass>
    </View>
  );
}

function HeadedPlanSteps({ entries }: PlanEntriesProps): JSX.Element {
  return (
    <View>
      <PlanPopoverHeading entries={entries} />
      <PlanSteps entries={entries} />
    </View>
  );
}

// A web popover heads the steps (with the plan's progress when wide); a native sheet carries its own title and draws the steps in a grouped card.
export function PlanPopoverContent({ entries }: PlanEntriesProps): JSX.Element {
  if (phoneSheet) return <PlanSheetContent entries={entries} />;

  return <HeadedPlanSteps entries={entries} />;
}

function PlanCompletionMeter({
  done,
  total,
}: {
  done: number;
  total: number;
}): JSX.Element {
  return (
    <View className="w-16">
      <Meter percent={(done / total) * fullPercent} className="h-1" />
    </View>
  );
}
