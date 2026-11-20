import { progressBarDefaults } from '@repo/contracts/kit-tokens';
import type { ComponentProps, ReactElement } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { cn } from '../../../utils';
import { progressColors } from './progress-bar-colors';
import type { ProgressBarProps, ProgressSteps } from './progress-bar-props';
import { ProgressSweep } from './progress-bar-sweep';

type StepState = 'done' | 'started' | 'pending';

interface Step {
  // A step's place in the Plan, which stays its identity as it moves from pending to done.
  id: string;
  state: StepState;
}

function stepState(index: number, { done, started }: ProgressSteps): StepState {
  if (index < done) return 'done';

  return index < done + started ? 'started' : 'pending';
}

function stepsOf(steps: ProgressSteps): Step[] {
  return Array.from({ length: Math.max(0, steps.total) }, (_, index) => ({
    id: `step-${index}`,
    state: stepState(index, steps),
  }));
}

function stepColor(state: StepState, props: ProgressBarProps): string {
  const colors = progressColors[props.tone ?? progressBarDefaults.tone];

  return { done: colors.fill, started: colors.started, pending: 'bg-hairline' }[
    state
  ];
}

function stepTestID(
  testID: string | undefined,
  state: StepState,
): string | undefined {
  return testID ? `${testID}-step-${state}` : undefined;
}

const segmentClassName = 'h-full flex-1 overflow-hidden rounded-full';

// The step underway glints while the work is live, the same sweep a plain bar's fill runs.
function StartedSegment(props: ProgressBarProps): ReactElement {
  const width = useSharedValue(0);

  const measure = (event: LayoutChangeEvent): void =>
    width.set(event.nativeEvent.layout.width);

  return (
    <View
      testID={stepTestID(props.testID, 'started')}
      onLayout={measure}
      className={cn(segmentClassName, stepColor('started', props))}
    >
      <ProgressSweep {...sweepOf(props)} fillWidth={width} />
    </View>
  );
}

function sweepOf({
  active,
  testID,
}: ProgressBarProps): Omit<ComponentProps<typeof ProgressSweep>, 'fillWidth'> {
  return { active, testID: testID ? `${testID}-sweep` : undefined };
}

function Segment({
  state,
  ...props
}: ProgressBarProps & { state: StepState }): ReactElement {
  if (state === 'started') return <StartedSegment {...props} />;

  return (
    <View
      testID={stepTestID(props.testID, state)}
      className={cn(segmentClassName, stepColor(state, props))}
    />
  );
}

/*
 * One rounded segment per step, 3 apart. Done steps take the tone, a started step its
 * pale tint, and the rest the hairline, so a last step underway never reads as a full bar.
 */
export function ProgressStepSegments({
  steps,
  ...props
}: ProgressBarProps & { steps: ProgressSteps }): ReactElement {
  return (
    <View className="h-full w-full flex-row gap-0.75">
      {stepsOf(steps).map(({ id, state }) => (
        <Segment {...props} key={id} state={state} />
      ))}
    </View>
  );
}
