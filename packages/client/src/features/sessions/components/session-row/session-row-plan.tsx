import type { SessionInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/display/text';

interface PlanProps {
  plan: NonNullable<SessionInfo['plan']>;
}

function planStepClass(position: number, done: number): string {
  return cn(
    'h-1 min-w-0 flex-1 rounded-full bg-foreground/15',
    position < done && 'bg-muted-foreground',
    position === done && 'bg-foreground',
  );
}

function PlanSteps({ plan }: PlanProps): React.JSX.Element {
  return (
    <View className="w-session-plan shrink-0 flex-row gap-0.5">
      {Array.from({ length: plan.total }, (_, index) => ({
        step: index + 1,
        position: index,
      })).map(({ step, position }) => (
        <View key={step} className={planStepClass(position, plan.done)} />
      ))}
    </View>
  );
}

export function PlanProgress({ plan }: PlanProps): React.JSX.Element {
  return (
    <View
      accessibilityLabel={`Plan: ${plan.done} of ${plan.total} complete`}
      className="shrink-0 flex-row items-center gap-1.5"
    >
      <PlanSteps plan={plan} />
      <Text role="secondary">
        {plan.done}/{plan.total}
      </Text>
    </View>
  );
}
