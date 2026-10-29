import { Text } from '@repo/kit/primitives/content/text';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleHeader,
  useCollapsibleHovered,
} from '@repo/kit/primitives/layout/collapsible';
import type { IconName } from '@repo/kit/symbols/icon-names';
import type * as React from 'react';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import {
  FeedDisclosureLabel,
  type FeedDisclosureLabelProps,
} from './feed-disclosure-label';

export interface FeedDisclosureProps extends Omit<
  FeedDisclosureLabelProps,
  'hovered'
> {
  icon?: IconName;
  // Draws the icon and the title in place of the label's, for a live header.
  leading?: ReactNode;
  title?: ReactNode;
  failed?: boolean;
  initialOpen?: boolean;
  children: ReactNode;
}

function AwaitingApprovalBadge(): React.JSX.Element {
  return (
    <View className="rounded-sm border border-warning/20 bg-warning/10 px-1.5">
      <Text className="text-warning">Awaiting approval</Text>
    </View>
  );
}

function FeedDisclosureTitle(
  props: Omit<FeedDisclosureProps, 'children'>,
): React.JSX.Element {
  const hovered = useCollapsibleHovered();

  return (
    <>
      {props.title ?? <FeedDisclosureLabel {...props} hovered={hovered} />}
      {props.awaitingApproval && <AwaitingApprovalBadge />}
    </>
  );
}

function FeedDisclosureHeader(
  props: Omit<FeedDisclosureProps, 'children'>,
): React.JSX.Element {
  return (
    <CollapsibleHeader
      label={props.label}
      icon={props.icon}
      leading={props.leading}
      iconTone={props.failed ? 'danger' : undefined}
    >
      <FeedDisclosureTitle {...props} />
    </CollapsibleHeader>
  );
}

export function FeedDisclosure({
  children,
  ...props
}: FeedDisclosureProps): React.JSX.Element {
  const [open, setOpen] = useState(props.initialOpen === true);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <FeedDisclosureHeader {...props} />
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
