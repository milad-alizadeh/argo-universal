import type * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useReportComposerPills } from '#lib/product/composer-cover';
import {
  ComposerTodos,
  ComposerWorkChips,
} from '../composer-status/composer-status';
import { WrittenPlan } from '../written-plan/written-plan';
import type {
  TopTrayLayout,
  PlanLayout,
  WrittenPlanLayout,
  LivePlanLayout,
} from './composer-tray-types';
import type { ComposerProps } from './composer-types';
import { ComposerTypography } from './composer-typography';

// A phone's Plan, a pill above the Composer. A wide window's Plan sits in the Composer's tray.
export function ComposerPhoneTray(
  layout: TopTrayLayout,
): React.JSX.Element | null {
  return layout.wide ? null : (
    <ComposerTypography compact>
      <ComposerPhonePlan {...layout} />
    </ComposerTypography>
  );
}

// The Plan a wide window's tray holds: none while a request has the tray.
export function hasTrayPlan(layout: Pick<PlanLayout, 'props'>): boolean {
  return !hasRequest(layout) && hasPlan(layout);
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
  return Boolean(layout.props.phonePill) || hasPlan(layout) || hasWork(layout);
}

function ComposerPhonePlan(layout: PlanLayout): React.JSX.Element | null {
  return hasPhoneTray(layout) ? <ComposerPhonePills {...layout} /> : null;
}

// The pill row reports its height, so the Feed's fade starts at its top and ends under it.
function ComposerPhonePills(layout: PlanLayout): React.JSX.Element {
  return (
    <View className="max-w-full pb-1" onLayout={useReportComposerPills()}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="min-h-7 flex-grow flex-row items-center justify-center gap-2"
      >
        {layout.props.phonePill}
        <ComposerPlans {...layout} />
        <PhoneWorkChips {...layout} />
      </ScrollView>
    </View>
  );
}

function PhoneWorkChips(layout: PlanLayout): React.JSX.Element | null {
  return layout.props.status ? (
    <ComposerWorkChips
      status={layout.props.status}
      disabled={layout.inactive}
    />
  ) : null;
}

export function ComposerPlans(layout: PlanLayout): React.JSX.Element {
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
    <ComposerTodos entries={entries} disabled={layout.inactive} />
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
  return Boolean(props.permissionRequest || props.elicitation || props.callout);
}
