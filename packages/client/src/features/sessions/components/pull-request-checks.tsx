import type * as React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { withUniwind } from 'uniwind';
import { Text } from '#lib/generic/primitives/display/text/text';
import { Icon, IconSlot } from '../../../lib/generic/symbols/icon';

// A PR's CI checks: how many passed, failed and still run, out of all of them.
export interface PullRequestChecksProps {
  passed: number;
  failing: number;
  running: number;
  total: number;
}

type ChecksState = 'failing' | 'running' | 'passed';

const ringRadius = 5.5;
const ringCircumference = 2 * Math.PI * ringRadius;
const ringCircle = {
  cx: 7,
  cy: 7,
  r: ringRadius,
  fill: 'none',
  strokeWidth: 2,
} as const;

// Each arc stops short of the next one by this much.
const arcGap = 1.2;

const stateTone = {
  failing: { text: 'text-destructive', stroke: 'bg-destructive' },
  running: { text: 'text-warning', stroke: 'bg-warning' },
  passed: { text: 'text-success', stroke: 'bg-success' },
} satisfies Record<ChecksState, { text: string; stroke: string }>;

const ThemedCircle = withUniwind(Circle, {
  stroke: {
    fromClassName: 'strokeClassName',
    styleProperty: 'backgroundColor',
  },
});

function checksState({
  failing,
  running,
}: PullRequestChecksProps): ChecksState {
  if (failing > 0) return 'failing';
  return running > 0 ? 'running' : 'passed';
}

function stateText(checks: PullRequestChecksProps, state: ChecksState): string {
  if (state === 'failing') return `${checks.failing} failing`;
  return state === 'running' ? `${checks.running} running` : 'passed';
}

function arc(share: number, total: number): number {
  return total === 0 ? 0 : (ringCircumference * share) / total;
}

function Ring({
  checks,
  state,
}: {
  checks: PullRequestChecksProps;
  state: ChecksState;
}): React.JSX.Element {
  if (state === 'passed')
    return <Icon role="secondary" name="passed" className="text-success" />;
  const passedArc = arc(checks.passed, checks.total);
  const restArc = arc(checks.total - checks.passed, checks.total);
  return (
    <IconSlot role="secondary">
      <Svg width="100%" height="100%" viewBox="0 0 14 14">
        <ThemedCircle {...ringCircle} strokeClassName="bg-border" />
        <ThemedCircle
          {...ringCircle}
          transform="rotate(-90 7 7)"
          strokeDasharray={`${Math.max(0, passedArc - arcGap)} ${ringCircumference}`}
          strokeClassName="bg-success"
        />
        <ThemedCircle
          {...ringCircle}
          transform="rotate(-90 7 7)"
          strokeDasharray={`${Math.max(0, restArc - arcGap)} ${ringCircumference}`}
          strokeDashoffset={-passedArc}
          strokeClassName={stateTone[state].stroke}
        />
      </Svg>
    </IconSlot>
  );
}

// "Checks 3/5 · 2 running": a ring split by result, the count, and the state in its colour.
export function PullRequestChecks(
  checks: PullRequestChecksProps,
): React.JSX.Element {
  const summary = `Checks ${checks.passed}/${checks.total}`;
  const state = checksState(checks);
  const label = stateText(checks, state);
  return (
    <View
      accessible
      accessibilityLabel={`${summary}, ${label}`}
      className="flex-row items-center gap-1"
    >
      <Ring checks={checks} state={state} />
      <Text role="secondary" className="font-medium text-foreground">
        {summary}
      </Text>
      <Text role="secondary" className={stateTone[state].text}>
        {label}
      </Text>
    </View>
  );
}
