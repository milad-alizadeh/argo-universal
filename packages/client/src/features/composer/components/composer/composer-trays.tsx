import type * as React from 'react';
import { View } from 'react-native';
import { ComposerCheckoutControl } from '../composer-configuration/composer-configuration';
import {
  ComposerPlan,
  ComposerWorkChips,
  ComposerStatusControls,
} from '../composer-status/composer-status';
import { WrittenPlan } from '../written-plan/written-plan';
import type {
  TopTrayLayout,
  PlanLayout,
  WrittenPlanLayout,
  LivePlanLayout,
  BottomTrayLayout,
  WideStatusLayout,
  StatusLayout,
  CheckoutLayout,
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
  return props.planProposal || props.permissionRequest
    ? undefined
    : props.writtenPlan;
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
    <View className="self-stretch mx-1.75 -mb-3 pb-3 rounded-t-2xl bg-[#e5e5e5b3] dark:bg-[#262626b3] shadow-tray web:backdrop-blur-glass web:backdrop-saturate-180">
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

export function ComposerBottomTray(
  layout: BottomTrayLayout,
): React.JSX.Element | null {
  if (!layout.wide) return null;

  return <ComposerWideStatus {...layout} />;
}

function ComposerWideStatus(
  layout: WideStatusLayout,
): React.JSX.Element | null {
  if (!(layout.props.configuration || layout.props.status)) return null;

  return (
    <View className="h-11 self-stretch mx-1.75 -mt-3 pt-3 pr-2.5 rounded-b-2xl bg-[#e5e5e5b3] dark:bg-[#262626b3] shadow-tray web:backdrop-blur-glass web:backdrop-saturate-180">
      <View className="flex-1 min-h-0 flex-row items-center pl-0.5 gap-1">
        <ComposerTrayStatus {...layout} />
        <View className="flex-1" />
        <ComposerTrayCheckout {...layout} />
      </View>
    </View>
  );
}

function ComposerTrayStatus({
  props,
  inactive,
}: StatusLayout): React.JSX.Element | null {
  return props.status ? (
    <View>
      <ComposerStatusControls status={props.status} disabled={inactive} />
    </View>
  ) : null;
}

function ComposerTrayCheckout({
  props,
  inactive,
}: CheckoutLayout): React.JSX.Element | null {
  return props.configuration ? (
    <View>
      <ComposerCheckoutControl
        checkout={props.configuration.checkout}
        disabled={inactive}
      />
    </View>
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
  return Boolean(props.planProposal || props.permissionRequest);
}
