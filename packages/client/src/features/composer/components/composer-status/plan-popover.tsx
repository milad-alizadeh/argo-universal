import type { PlanEntry } from '@repo/contracts';
import type { JSX } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text/text';
import { Icon } from '../../../../lib/generic/symbols/icon';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { completedSteps, fullPercent } from '../../state/status';
import { useNativeSheets } from '../agent-model-sheet-context';
import { PlanSteps } from './plan-steps';
import { Meter } from './status-meter';

const planHeadingProps = {
  role: 'heading',
  semanticRole: 'heading',
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

function PlanPopoverHeading({
  entries,
  windowWide,
}: {
  entries: PlanEntry[];
  windowWide: boolean;
}): JSX.Element {
  return (
    <View className="px-4 py-3 gap-1.5">
      <PlanHeading />
      {windowWide && <PlanCompletion entries={entries} />}
    </View>
  );
}

export function PlanPopoverContent({ entries }: PlanEntriesProps): JSX.Element {
  const windowWide = useWide();
  const nativeSheets = useNativeSheets();

  return (
    <View>
      {(windowWide || !nativeSheets) && (
        <PlanPopoverHeading entries={entries} windowWide={windowWide} />
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
