import { resourceName } from '@repo/kit/primitives/content/code';
import { Sheet } from '@repo/kit/primitives/overlays/sheet';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { planTitle } from '../../../../lib/product/markdown/plan-title';
import { useWrittenPlanEscape } from '../../hooks/use-written-plan-escape';
import { WrittenPlanContent } from './written-plan-content';
import {
  WrittenPlanTrigger,
  type WrittenPlanTriggerProps,
} from './written-plan-trigger';
import type { WrittenPlanProps, WrittenPlanValue } from './written-plan-types';

export type { WrittenPlanValue } from './written-plan-types';

interface PlanPresentation extends WrittenPlanTriggerProps {
  plan: WrittenPlanValue;
}

export function WrittenPlan({
  plan,
  composerId,
}: WrittenPlanProps): React.JSX.Element {
  const wide = useContentWide();
  const [open, setOpen] = useState(false);
  useWrittenPlanEscape({
    composerId,
    expanded: wide && open,
    onCollapse: () => setOpen(false),
  });
  const props = { plan, wide, open, setOpen, title: writtenPlanTitle(plan) };

  return wide ? <PlanTray {...props} /> : <PlanSheet {...props} />;
}

function writtenPlanTitle(plan: WrittenPlanValue): string {
  if (plan.type === 'file') return resourceName(plan.uri);

  return planTitle(plan.content, 'Written plan');
}

function PlanTray(props: PlanPresentation): React.JSX.Element {
  return (
    <View>
      <WrittenPlanTrigger {...props} />
      {props.open && (
        <WrittenPlanContent
          plan={props.plan}
          title={props.title}
          layout="tray"
        />
      )}
    </View>
  );
}

function PlanSheet(props: PlanPresentation): React.JSX.Element {
  return (
    <Sheet {...planSheetProps(props)}>
      <WrittenPlanContent
        plan={props.plan}
        title={props.title}
        layout="sheet"
      />
    </Sheet>
  );
}

function planSheetProps(
  props: PlanPresentation,
): Pick<
  React.ComponentProps<typeof Sheet>,
  'open' | 'onOpenChange' | 'trigger' | 'label' | 'detents'
> {
  return {
    open: props.open,
    onOpenChange: props.setOpen,
    trigger: WrittenPlanTrigger(props),
    label: props.title,
    // A written plan reads at the full height; a plan file's card is as tall as itself.
    detents: props.plan.type === 'markdown' ? ['large'] : undefined,
  };
}
