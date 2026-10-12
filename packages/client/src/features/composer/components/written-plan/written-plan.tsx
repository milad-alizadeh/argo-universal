import type { Plan } from '@repo/contracts';
import { lexer, type Tokens } from 'marked';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { FeedCodeBlock } from '#lib/product/markdown/feed-code-block/feed-code-block';
import { PlanDocument } from '#lib/product/plan-document';
import { IconButton } from '#primitives/buttons/icon-button/icon-button';
import { Icon } from '#primitives/display/icon/icon';
import { Text } from '#primitives/display/text/text';
import { BottomSheet } from '#primitives/overlays/bottom-sheet/bottom-sheet';
import { Pressable, contentActionClass } from '#primitives/pressable/pressable';
import { resourceName } from '../../../../lib/product/markdown/resource-name';
import { useWrittenPlanEscape } from '../../hooks/use-written-plan-escape';

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
    <Pressable
      accessibilityLabel="Written plan"
      aria-expanded={open}
      onPress={() => setOpen(!open)}
      role="button"
      className={contentActionClass({
        variant: 'ghost',
        className: cn(
          'h-6 sm:h-6 py-0 px-2.5 gap-1.5 rounded-full border border-border bg-card shadow-composer',
          wide &&
            'h-8 sm:h-8 w-full justify-start pl-2 pr-1.5 rounded-none border-0 bg-transparent shadow-none',
        ),
      })}
    >
      <Icon role="control" name="file-text" className="text-muted-foreground" />
      <Text role="secondary" className={cn(!wide && 'text-foreground')}>
        Written plan
      </Text>
      {wide && (
        <>
          <Text
            numberOfLines={1}
            role="secondary"
            className="min-w-0 flex-1 text-foreground"
          >
            {title}
          </Text>
          <Icon
            role="secondary"
            name="chevron-up"
            className="text-muted-foreground"
          />
        </>
      )}
    </Pressable>
  );
  if (!wide)
    return (
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        trigger={trigger}
        label={title}
        initialSize={plan.type === 'markdown' ? 'expanded' : 'compact'}
        fit={plan.type === 'file'}
      >
        <WrittenPlanHeading title={title} onClose={() => setOpen(false)} />
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
        <View className={layout === 'sheet' ? 'px-4' : undefined}>
          <PlanDocument content={plan.content} layout={layout} />
        </View>
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

function WrittenPlanHeading(props: {
  title: string;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-1.5 px-4 py-2">
      <Icon role="control" name="file-text" className="text-muted-foreground" />
      <Text role={'heading'} className="min-w-0 flex-1">
        {props.title}
      </Text>
      <IconButton
        icon="collapse"
        variant="default"
        accessibilityLabel="Close written plan"
        onPress={props.onClose}
      />
    </View>
  );
}
