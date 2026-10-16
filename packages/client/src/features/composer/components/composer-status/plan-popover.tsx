import type { PlanEntry } from '@repo/contracts';
import type { JSX } from 'react';
import { Platform, View } from 'react-native';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import { completedSteps, fullPercent } from '../../state/status';
import { PlanSteps } from './plan-steps';
import { Meter } from './status-meter';

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

// A wide window heads the steps with the plan's progress; a compact web window with its title alone, as a phone's sheet carries its own.
export function PlanPopoverContent({ entries }: PlanEntriesProps): JSX.Element {
  const heading = <PlanPopoverHeading entries={entries} />;

  return (
    <View>
      {Platform.OS === 'web' ? (
        heading
      ) : (
        <SizeClass only="wide">{heading}</SizeClass>
      )}
      <PlanSteps entries={entries} />
    </View>
  );
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
