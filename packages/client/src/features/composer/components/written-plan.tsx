import type { Plan } from '@repo/contracts';
import { lexer, type Tokens } from 'marked';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '#lib/generic/primitives/button';
import { Text } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { FeedCodeBlock } from '#lib/product/markdown/feed-code-block';
import { PlanDocument } from '#lib/product/plan-document';
import { BottomSheet } from '../../../lib/generic/primitives/bottom-sheet';
import { Icon } from '../../../lib/generic/symbols/icon';
import { resourceName } from '../../../lib/product/markdown/resource-name';
import { useWrittenPlanEscape } from '../hooks/use-written-plan-escape';

export type WrittenPlanValue = Exclude<Plan, { type: 'items' }>;

export function WrittenPlan({
  plan,
  composerId,
}: {
  plan: WrittenPlanValue;
  composerId: string;
}): React.JSX.Element {
  const wide = useContentWide();
  const [open, setOpen] = useState(false);
  useWrittenPlanEscape({
    composerId,
    expanded: wide && open,
    onCollapse: () => setOpen(false),
  });
  const title =
    plan.type === 'file'
      ? resourceName(plan.uri)
      : (lexer(plan.content).find(
          (token): token is Tokens.Heading => token.type === 'heading',
        )?.text ?? 'Written plan');
  const trigger = (
    <Button
      variant="ghost"
      accessibilityLabel="Written plan"
      aria-expanded={open}
      onPress={() => setOpen(!open)}
      className={cn(
        'h-6 sm:h-6 py-0 px-2.5 gap-1.5 rounded-full border border-border bg-card shadow-composer',
        wide &&
          'h-8 sm:h-8 w-full justify-start pl-2 pr-1.5 rounded-none border-0 bg-transparent shadow-none',
      )}
    >
      <Icon name="file-text" className="text-muted-foreground" />
      <Text
        className={cn(
          'text-xs leading-4 font-normal',
          wide && 'text-muted-foreground',
        )}
      >
        Written plan
      </Text>
      {wide && (
        <>
          <Text
            numberOfLines={1}
            className="min-w-0 flex-1 text-xs leading-4 font-normal text-foreground"
          >
            {title}
          </Text>
          <Icon size="sm" name="chevron-up" className="text-muted-foreground" />
        </>
      )}
    </Button>
  );
  if (!wide)
    return (
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        trigger={trigger}
        label={title}
      >
        <View className="flex-row items-center gap-1.5 px-4 py-2">
          <Icon name="file-text" className="text-muted-foreground" />
          <Text role={'heading'} className="min-w-0 flex-1">
            {title}
          </Text>
        </View>
        <WrittenPlanContent plan={plan} title={title} layout="sheet" />
      </BottomSheet>
    );
  return (
    <View>
      {trigger}
      {open && <WrittenPlanContent plan={plan} title={title} layout="tray" />}
    </View>
  );
}

function WrittenPlanContent({
  plan,
  title,
  layout,
}: {
  plan: WrittenPlanValue;
  title: string;
  layout: 'tray' | 'sheet';
}): React.JSX.Element {
  return (
    <View role="region" accessibilityLabel="Written plan content">
      {plan.type === 'markdown' ? (
        <PlanDocument content={plan.content} layout={layout} />
      ) : (
        <View className="gap-2 px-4 pt-2 pb-4">
          <FeedCodeBlock resource={{ name: title, uri: plan.uri }} />
          <Text role="secondary">
            The Agent shared where the plan is, not its text.
          </Text>
        </View>
      )}
    </View>
  );
}
