import type { Plan } from '@repo/contracts';
import { lexer, type Tokens } from 'marked';
import { CaretUpIcon, FileTextIcon } from 'phosphor-react-native';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { Icon } from '../lib/icon';
import { ComposerSheet } from './composer-sheet';
import { useContentWide } from './content-layout';
import { ResourceReference, resourceName } from './feed-reference';
import { PlanDocument } from './plan-document';
import { useWrittenPlanEscape } from './use-written-plan-escape';

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
      <Icon as={FileTextIcon} className="text-muted-foreground" />
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
          <Icon size="sm" as={CaretUpIcon} className="text-muted-foreground" />
        </>
      )}
    </Button>
  );
  if (!wide)
    return (
      <ComposerSheet
        open={open}
        onOpenChange={setOpen}
        onClosed={() => {}}
        trigger={trigger}
        label={title}
      >
        <View className="flex-row items-center gap-1.5 px-4 py-2">
          <Icon as={FileTextIcon} className="text-muted-foreground" />
          <Text className="min-w-0 flex-1 text-sm leading-5.5 font-semibold">
            {title}
          </Text>
        </View>
        <WrittenPlanContent plan={plan} title={title} layout="sheet" />
      </ComposerSheet>
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
          <ResourceReference name={title} uri={plan.uri} />
          <Text className="text-xs leading-4 text-muted-foreground">
            The Agent shared where the plan is, not its text.
          </Text>
        </View>
      )}
    </View>
  );
}
