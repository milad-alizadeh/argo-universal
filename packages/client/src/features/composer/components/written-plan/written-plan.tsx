import { lexer, type Tokens } from 'marked';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import { useContentWide } from '#lib/product/content-layout';
import { BottomSheet } from '../../../../lib/generic/primitives/overlays/bottom-sheet/bottom-sheet';
import { Icon } from '../../../../lib/generic/symbols/icon';
import { resourceName } from '../../../../lib/product/markdown/resource-name';
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
  return markdownTitle(plan.content);
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
    <BottomSheet {...planSheetProps(props)}>
      <PlanHeading title={props.title} />
      <WrittenPlanContent
        plan={props.plan}
        title={props.title}
        layout="sheet"
      />
    </BottomSheet>
  );
}
function PlanHeading({ title }: { title: string }): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-1.5 px-4 py-2">
      <Icon role="control" name="file-text" className="text-muted-foreground" />
      <Text role={'heading'} className="min-w-0 flex-1">
        {title}
      </Text>
    </View>
  );
}
function markdownTitle(content: string): string {
  return (
    lexer(content).find(
      (token): token is Tokens.Heading => token.type === 'heading',
    )?.text ?? 'Written plan'
  );
}
function planSheetProps(
  props: PlanPresentation,
): Pick<
  React.ComponentProps<typeof BottomSheet>,
  'open' | 'onOpenChange' | 'trigger' | 'label'
> {
  return {
    open: props.open,
    onOpenChange: props.setOpen,
    trigger: WrittenPlanTrigger(props),
    label: props.title,
  };
}
