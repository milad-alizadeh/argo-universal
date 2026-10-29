import type { PlanEntry } from '@repo/contracts';
import type { JSX } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useContentWide } from '#lib/product/content-layout';
import { usePlanReveal } from '../../hooks/use-plan-reveal';
import { ComposerPopover } from '../composer-popover/composer-popover';
import { PlanPopoverContent } from './plan-popover';
import { PlanSteps } from './plan-steps';
import { createPlanTrigger } from './plan-trigger';
import { phoneSheet } from './status-surface';

export interface ComposerPlanProps {
  // The Agent's live Plan; its completed steps fill the trigger's marks.
  entries: PlanEntry[];
  disabled: boolean;
}

type PlanReveal = ReturnType<typeof usePlanReveal>;

interface RevealedPlanProps {
  entries: PlanEntry[];
  reveal: PlanReveal;
}

function RevealedPlan({ entries, reveal }: RevealedPlanProps): JSX.Element {
  const revealProps = planRevealProps(reveal);

  return (
    <Animated.View testID="composer-plan-steps" {...revealProps}>
      <MeasuredPlan {...{ entries, reveal }} />
    </Animated.View>
  );
}

interface PhonePlanProps {
  entries: PlanEntry[];
  trigger: JSX.Element;
}

const phonePopoverProps = {
  label: 'Plan',
  width: 420,
  listContent: phoneSheet,
};

function PhonePlan({ entries, trigger }: PhonePlanProps): JSX.Element {
  return (
    <ComposerPopover {...phonePopoverProps} trigger={trigger}>
      {() => <PlanPopoverContent entries={entries} />}
    </ComposerPopover>
  );
}

export function StatusPlan(props: ComposerPlanProps): JSX.Element {
  const wide = useContentWide();
  const reveal = usePlanReveal();

  const expansionProps = {
    wide,
    expanded: reveal.expanded,
    toggle: reveal.toggle,
  };

  const trigger = createPlanTrigger({ ...props, ...expansionProps });
  const layoutProps = { entries: props.entries, wide, reveal, trigger };

  return <PlanLayout {...layoutProps} />;
}

function PlanLayout(
  props: RevealedPlanProps & PhonePlanProps & { wide: boolean },
): JSX.Element {
  if (props.wide)
    return (
      <View>
        {props.trigger}
        <RevealedPlan entries={props.entries} reveal={props.reveal} />
      </View>
    );

  return <PhonePlan entries={props.entries} trigger={props.trigger} />;
}

type PlanVisibility = {
  'aria-hidden': boolean;
  accessibilityElementsHidden: boolean;
  className: string;
  style: PlanReveal['style'];
};

function planRevealProps(reveal: PlanReveal): PlanVisibility {
  return {
    'aria-hidden': !reveal.expanded,
    accessibilityElementsHidden: !reveal.expanded,
    className: reveal.expanded
      ? 'overflow-hidden pointer-events-auto'
      : 'overflow-hidden pointer-events-none',
    style: reveal.style,
  };
}

function MeasuredPlan({ entries, reveal }: RevealedPlanProps): JSX.Element {
  return (
    <View className="absolute top-0 left-0 right-0" onLayout={reveal.onLayout}>
      <PlanSteps entries={entries} />
    </View>
  );
}
