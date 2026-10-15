import type { SessionInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { PlanSweep } from './session-row-plan-sweep';

type Plan = NonNullable<SessionInfo['plan']>;

type Status = SessionInfo['status'];

const underWay = (plan: Plan): boolean =>
  plan.total > 0 && plan.done < plan.total;

// A Plan still under way; a finished Plan shows nothing.
const unfinishedPlan = (plan: SessionInfo['plan']): Plan | undefined =>
  plan && underWay(plan) ? plan : undefined;

const planLabel = (plan: Plan): string =>
  `Plan: ${plan.done} of ${plan.total} complete`;

// The bar takes the status colour; its track is the same colour, faint.
const barColors = {
  needs_input: { track: 'bg-warning/15', fill: 'bg-warning' },
  running: { track: 'bg-success/15', fill: 'bg-success' },
  failed: { track: 'bg-danger/15', fill: 'bg-danger' },
  unread: { track: 'bg-info/15', fill: 'bg-info' },
  idle: { track: 'bg-muted-foreground/15', fill: 'bg-muted-foreground' },
} satisfies Record<Status, { track: string; fill: string }>;

// Only work that is live, or waits on you, sweeps.
const sweeps = {
  needs_input: true,
  running: true,
  failed: false,
  unread: false,
  idle: false,
} satisfies Record<Status, boolean>;

interface PlanBarProps {
  plan: Plan;
  status: Status;
}

const wholePercent = 100;

interface FillStyle {
  width: `${number}%`;
}

const filledWidth = (plan: Plan): FillStyle => ({
  width: `${Math.round((plan.done / plan.total) * wholePercent)}%`,
});

// The done share of the bar, which sweeps while the Session is live or waits on you.
function PlanFill({ plan, status }: PlanBarProps): React.JSX.Element {
  const fill = cn('h-full overflow-hidden', barColors[status].fill);

  return (
    <View style={filledWidth(plan)} className={fill}>
      {sweeps[status] ? <PlanSweep /> : null}
    </View>
  );
}

// A row's Plan: a thin bar flush with its bottom edge, which the row's corners clip.
function PlanBar(props: PlanBarProps): React.JSX.Element {
  const track = cn(
    'absolute inset-x-0 bottom-0 h-0.75 wide:h-0.5',
    barColors[props.status].track,
  );

  return (
    <View
      testID="session-plan-bar"
      accessibilityLabel={planLabel(props.plan)}
      className={track}
    >
      <PlanFill {...props} />
    </View>
  );
}

export function SessionPlanBar(props: {
  plan: SessionInfo['plan'];
  status: Status;
}): React.JSX.Element | null {
  const plan = unfinishedPlan(props.plan);

  return plan ? <PlanBar plan={plan} status={props.status} /> : null;
}
