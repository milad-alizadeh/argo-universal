import { Text } from '@repo/kit/primitives/content/text';
import {
  StatusDot,
  type StatusDotProps,
} from '@repo/kit/primitives/status/status-dot';
import type * as React from 'react';
import { View } from 'react-native';

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

const stateDot = {
  failing: { tone: 'danger', pulse: false },
  running: { tone: 'warning', pulse: true },
  passed: { tone: 'success', pulse: false },
} as const satisfies Record<
  ChecksState,
  Pick<StatusDotProps, 'tone' | 'pulse'>
>;

// Passed only when every Check passed: Checks that are missing, or not all in, are never read as passed.
const allPassed = ({ passed, total }: PullRequestChecksProps): boolean =>
  total > 0 && passed === total;

export function checksState(checks: PullRequestChecksProps): ChecksState {
  if (checks.failing > 0) return 'failing';

  return allPassed(checks) ? 'passed' : 'running';
}

function stateText(checks: PullRequestChecksProps, state: ChecksState): string {
  if (state === 'failing') return `${checks.failing} failing`;

  return state === 'running' ? `${checks.running} running` : 'passed';
}

// The checks' state as a StatusDot: amber and blinking while any check runs, red once one fails, green when all pass.
export function ChecksDot({
  state,
}: {
  state: ChecksState;
}): React.JSX.Element {
  return <StatusDot {...stateDot[state]} />;
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

// The dot shows the state, so the line reads the count only; the state is read out.
function ChecksSummary(props: ChecksSummaryProps): React.JSX.Element {
  return (
    <Text role="secondary" className="font-medium text-foreground">
      {props.summary}
    </Text>
  );
}

// "CI Checks 3/5": a dot coloured by state, blinking while checks run, and the count.
export function PullRequestChecks(
  checks: PullRequestChecksProps & { compact?: boolean },
): React.JSX.Element {
  const description = describeChecks(checks);

  return (
    <View
      accessible
      accessibilityLabel={`${description.summary}, ${description.label}`}
      className="flex-row items-center gap-1.5"
    >
      <ChecksDot state={description.state} />
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
