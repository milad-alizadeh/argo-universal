import { Icon, IconSlot } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { withUniwind } from 'uniwind';

export type ChecksState = 'failing' | 'running' | 'passed';

// One CI check of a PR: its name and how it stands.
export interface CheckDetail {
  name: string;
  state: ChecksState;
}

// A PR's CI checks: how many passed, failed and still run, out of all of them, and each one by name.
export interface PullRequestChecksProps {
  passed: number;
  failing: number;
  running: number;
  total: number;
  details?: readonly CheckDetail[];
}

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
  failing: { stroke: 'bg-danger' },
  running: { stroke: 'bg-warning' },
  passed: { stroke: 'bg-success' },
} satisfies Record<ChecksState, { stroke: string }>;

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

interface ChecksRingProps {
  checks: PullRequestChecksProps;
  state: ChecksState;
}

const ringArc = { ...ringCircle, transform: 'rotate(-90 7 7)' } as const;

function dashes(length: number): string {
  return `${Math.max(0, length - arcGap)} ${ringCircumference}`;
}

interface RingArcProps {
  length: number;
  strokeClassName: string;
  strokeDashoffset?: number;
}

function RingArc({ length, ...circle }: RingArcProps): React.JSX.Element {
  return (
    <ThemedCircle {...ringArc} strokeDasharray={dashes(length)} {...circle} />
  );
}

function SplitRing({ checks, state }: ChecksRingProps): React.JSX.Element {
  const passedArc = arc(checks.passed, checks.total);

  return (
    <Svg width="100%" height="100%" viewBox="0 0 14 14">
      <ThemedCircle {...ringCircle} strokeClassName="bg-border" />
      <RingArc length={passedArc} strokeClassName="bg-success" />
      <RingArc
        length={arc(checks.total - checks.passed, checks.total)}
        strokeDashoffset={-passedArc}
        strokeClassName={stateTone[state].stroke}
      />
    </Svg>
  );
}

function Ring(props: ChecksRingProps): React.JSX.Element {
  if (props.state === 'passed')
    return <Icon name="passed" className="text-success" />;

  return (
    <IconSlot>
      <SplitRing {...props} />
    </IconSlot>
  );
}

interface ChecksSummaryProps {
  summary: string;
  label: string;
  state: ChecksState;
}

function describeChecks(checks: PullRequestChecksProps): ChecksSummaryProps {
  const state = checksState(checks);

  return {
    summary: `CI Checks ${checks.passed}/${checks.total}`,
    label: stateText(checks, state),
    state,
  };
}

// The ring shows the state, so the line reads the count only; the state is read out.
function ChecksSummary(props: ChecksSummaryProps): React.JSX.Element {
  return (
    <Text role="secondary" className="font-medium text-foreground">
      {props.summary}
    </Text>
  );
}

// "CI Checks 3/5": a ring split by result, coloured by state, and the count.
export function PullRequestChecks(
  checks: PullRequestChecksProps & { compact?: boolean },
): React.JSX.Element {
  const description = describeChecks(checks);

  return (
    <View
      accessible
      accessibilityLabel={`${description.summary}, ${description.label}`}
      className="flex-row items-center gap-1"
    >
      <Ring checks={checks} state={description.state} />
      <ChecksSummary {...description} summary={shownChecks(checks)} />
    </View>
  );
}

function shownChecks(
  checks: PullRequestChecksProps & { compact?: boolean },
): string {
  return checks.compact
    ? `${checks.passed}/${checks.total}`
    : `CI Checks ${checks.passed}/${checks.total}`;
}
