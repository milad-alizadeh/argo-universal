import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#primitives/collapsible';
import { Text, TextClassContext } from '#primitives/text';
import { DisclosureCaret } from './DisclosureCaret';
import { Icon } from './Icon';
import { ShimmerText } from './ShimmerText';

export interface FeedDisclosureProps {
  label: string;
  icon: PhosphorIcon;
  running?: boolean;
  failed?: boolean;
  initialOpen?: boolean;
  trailing?: string;
  awaitingApproval?: boolean;
  denied?: boolean;
  children: ReactNode;
}

export function FeedDisclosure({
  label,
  icon,
  running = false,
  failed = false,
  initialOpen = false,
  trailing,
  awaitingApproval = false,
  denied = false,
  children,
}: FeedDisclosureProps) {
  const [open, setOpen] = useState(initialOpen);
  const [hovered, setHovered] = useState(false);
  const title = trailing ? `${label} ${trailing}` : label;
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <TextClassContext.Provider value="select-none">
        <CollapsibleTrigger
          accessibilityLabel={label}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          className="min-h-5 max-w-full self-start flex-row items-center gap-1.5"
        >
          <View className="size-4 shrink-0 items-center justify-center">
            <Icon
              as={icon}
              className={cn(
                'size-4 text-muted-foreground',
                failed && 'text-destructive',
                hovered && 'text-foreground',
              )}
            />
          </View>
          <View className="min-w-0 shrink flex-row items-center gap-1">
            {running && !awaitingApproval ? (
              <ShimmerText
                text={title}
                emphasized={hovered}
                className="min-w-0 shrink text-sm leading-5 text-foreground"
              />
            ) : (
              <Text
                numberOfLines={1}
                selectable={false}
                className={cn(
                  'min-w-0 shrink text-sm leading-5 text-muted-foreground',
                  hovered && 'text-foreground',
                  awaitingApproval && 'text-warning',
                  denied && 'line-through',
                )}
              >
                {title}
              </Text>
            )}
            {awaitingApproval && (
              <View className="rounded-sm border border-warning/20 bg-warning/10 px-1.5">
                <Text className="text-xs leading-4.5 text-warning">
                  Awaiting approval
                </Text>
              </View>
            )}
            <DisclosureCaret
              open={open}
              className={hovered ? 'text-foreground' : undefined}
            />
          </View>
        </CollapsibleTrigger>
      </TextClassContext.Provider>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
