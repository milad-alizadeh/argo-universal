import type * as React from 'react';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#lib/generic/primitives/display/collapsible/collapsible';
import { DisclosureChevron } from '#lib/generic/primitives/display/disclosure-chevron/disclosure-chevron';
import {
  Text,
  TextClassContext,
} from '#lib/generic/primitives/display/text/text';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { cn } from '#lib/generic/utils';
import { Icon } from '../../../lib/generic/symbols/icon';
import {
  FeedDisclosureLabel,
  type FeedDisclosureLabelProps,
  foregroundTextClassName,
} from './feed-disclosure-label';

export interface FeedDisclosureProps extends Omit<
  FeedDisclosureLabelProps,
  'hovered'
> {
  icon: IconName;
  failed?: boolean;
  initialOpen?: boolean;
  children: ReactNode;
}

type TriggerProps = Omit<FeedDisclosureProps, 'children'> & { open: boolean };

function useHovered(): [
  boolean,
  { onHoverIn: () => void; onHoverOut: () => void },
] {
  const [hovered, setHovered] = useState(false);

  return [
    hovered,
    { onHoverIn: () => setHovered(true), onHoverOut: () => setHovered(false) },
  ];
}

function AwaitingApprovalBadge(): React.JSX.Element {
  return (
    <View className="rounded-sm border border-warning/20 bg-warning/10 px-1.5">
      <Text className="text-warning">Awaiting approval</Text>
    </View>
  );
}

function FeedDisclosureIcon(
  props: TriggerProps & { hovered: boolean },
): React.JSX.Element {
  return (
    <Icon
      name={props.icon}
      role="body"
      className={cn('shrink-0 text-muted-foreground', {
        'text-destructive': props.failed,
        [foregroundTextClassName]: props.hovered,
      })}
    />
  );
}

function FeedDisclosureHeading(
  props: TriggerProps & { hovered: boolean },
): React.JSX.Element {
  return (
    <View className="min-w-0 shrink flex-row items-center gap-1">
      <FeedDisclosureLabel {...props} />
      {props.awaitingApproval && <AwaitingApprovalBadge />}
      <DisclosureChevron
        open={props.open}
        className={props.hovered ? foregroundTextClassName : undefined}
      />
    </View>
  );
}

function FeedDisclosureTrigger(props: TriggerProps): React.JSX.Element {
  const [hovered, hoverHandlers] = useHovered();

  return (
    <TextClassContext.Provider value="select-none">
      <CollapsibleTrigger
        accessibilityLabel={props.label}
        {...hoverHandlers}
        className="min-h-5 max-w-full self-start flex-row items-center gap-1.5"
      >
        <FeedDisclosureIcon {...props} hovered={hovered} />
        <FeedDisclosureHeading {...props} hovered={hovered} />
      </CollapsibleTrigger>
    </TextClassContext.Provider>
  );
}

export function FeedDisclosure({
  children,
  ...props
}: FeedDisclosureProps): React.JSX.Element {
  const [open, setOpen] = useState(props.initialOpen === true);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <FeedDisclosureTrigger {...props} open={open} />
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
