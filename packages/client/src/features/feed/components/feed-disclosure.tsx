import type * as React from 'react';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#lib/generic/primitives/collapsible';
import { Text, TextClassContext } from '#lib/generic/primitives/text';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { cn } from '#lib/generic/utils';
import { Icon } from '../../../lib/generic/symbols/icon';
import { DisclosureCaret } from './disclosure-caret';
import { ShimmerText } from './shimmer-text';

const foregroundTextClassName = 'text-foreground';

export interface FeedDisclosureProps {
  label: string;
  // Parts of the label to draw in mono.
  paths?: readonly string[];
  icon: IconName;
  running?: boolean;
  failed?: boolean;
  initialOpen?: boolean;
  trailing?: string;
  awaitingApproval?: boolean;
  denied?: boolean;
  children: ReactNode;
}

function withMonoPaths(title: string, paths: readonly string[]): ReactNode[] {
  const pattern = paths
    .filter(Boolean)
    .map((path) => path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  if (!pattern) return [title];
  let offset = 0;
  return title.split(new RegExp(`(${pattern})`)).map((part) => {
    const key = `${offset}`;
    offset += part.length;
    return paths.includes(part) ? (
      <Text key={key} className="type-code">
        {part}
      </Text>
    ) : (
      part
    );
  });
}

export function FeedDisclosure({
  label,
  paths = [],
  icon,
  running = false,
  failed = false,
  initialOpen = false,
  trailing,
  awaitingApproval = false,
  denied = false,
  children,
}: FeedDisclosureProps): React.JSX.Element {
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
          <Icon
            name={icon}
            className={cn(
              'shrink-0 text-muted-foreground',
              failed && 'text-destructive',
              hovered && foregroundTextClassName,
            )}
          />
          <View className="min-w-0 shrink flex-row items-center gap-1">
            {running && !awaitingApproval ? (
              <ShimmerText
                text={title}
                emphasized={hovered}
                className="min-w-0 shrink type-body"
              />
            ) : (
              <Text
                numberOfLines={1}
                selectable={false}
                className={cn(
                  'min-w-0 shrink type-body text-muted-foreground',
                  hovered && foregroundTextClassName,
                  awaitingApproval && 'text-warning',
                  denied && 'line-through',
                )}
              >
                {withMonoPaths(title, paths)}
              </Text>
            )}
            {awaitingApproval && (
              <View className="rounded-sm border border-warning/20 bg-warning/10 px-1.5">
                <Text className="type-badge text-warning">
                  Awaiting approval
                </Text>
              </View>
            )}
            <DisclosureCaret
              open={open}
              className={hovered ? foregroundTextClassName : undefined}
            />
          </View>
        </CollapsibleTrigger>
      </TextClassContext.Provider>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
