import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { View } from 'react-native';
import {
  ComposerPlan,
  ComposerWorkChips,
} from '../composer-status/composer-status';
import { WrittenPlan } from '../written-plan/written-plan';
import { composerTrayClass } from './composer-tray-class';
import type {
  TopTrayLayout,
  PlanLayout,
  WrittenPlanLayout,
  LivePlanLayout,
} from './composer-tray-types';
import type { ComposerProps } from './composer-types';

export function ComposerTopTray(
  layout: TopTrayLayout,
): React.JSX.Element | null {
  return layout.wide ? (
    <ComposerWidePlan {...layout} />
  ) : (
    <ComposerPhonePlan {...layout} />
  );
}

function shownWrittenPlan({
  props,
}: Pick<WrittenPlanLayout, 'props'>): ComposerProps['writtenPlan'] {
  return props.permissionRequest ? undefined : props.writtenPlan;
}

function hasPlan(layout: Pick<PlanLayout, 'props'>): boolean {
  return Boolean(shownWrittenPlan(layout) || hasLivePlan(layout));
}

function hasPhoneTray(layout: Pick<PlanLayout, 'props'>): boolean {
  return hasPlan(layout) || hasWork(layout);
}

function ComposerWidePlan(layout: PlanLayout): React.JSX.Element | null {
  if (hasRequest(layout) || !hasPlan(layout)) return null;

  return (
    <View className={cn(composerTrayClass, '-mb-3 pb-3 rounded-t-xl')}>
      <ComposerPlans {...layout} />
    </View>
  );
}

function ComposerPhonePlan(layout: PlanLayout): React.JSX.Element | null {
  if (!hasPhoneTray(layout)) return null;

  return (
    <View className="min-h-7 max-w-full mb-1 flex-row flex-wrap items-center justify-center gap-2">
      <ComposerPlans {...layout} />
      {layout.props.status && (
        <ComposerWorkChips
          status={layout.props.status}
          disabled={layout.inactive}
        />
      )}
    </View>
  );
}

function ComposerPlans(layout: PlanLayout): React.JSX.Element {
  return (
    <>
      <ComposerLivePlan {...layout} />
      <ComposerWrittenPlan {...layout} />
    </>
  );
}

function ComposerLivePlan(layout: LivePlanLayout): React.JSX.Element | null {
  const entries = livePlan(layout);

  return entries?.length ? (
    <ComposerPlan entries={entries} disabled={layout.inactive} />
  ) : null;
}

function ComposerWrittenPlan(
  layout: WrittenPlanLayout,
): React.JSX.Element | null {
  const plan = shownWrittenPlan(layout);

  return plan ? (
    <WrittenPlan key={plan.planId} plan={plan} composerId={layout.composerId} />
  ) : null;
}

function livePlan(
  layout: Pick<LivePlanLayout, 'props'>,
): NonNullable<ComposerProps['status']>['plan'] {
  return layout.props.status?.plan;
}

function hasLivePlan(layout: Pick<LivePlanLayout, 'props'>): boolean {
  return Boolean(livePlan(layout)?.length);
}

function hasWork({ props }: Pick<LivePlanLayout, 'props'>): boolean {
  return props.status
    ? Boolean(props.status.subagents || props.status.shells)
    : false;
}

function hasRequest({ props }: Pick<PlanLayout, 'props'>): boolean {
  return Boolean(props.permissionRequest || props.callout);
}
