import type * as React from 'react';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { Text } from '#primitives/content/text';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleHeader,
  useCollapsibleHovered,
} from '#primitives/layout/collapsible';
import {
  FeedDisclosureLabel,
  type FeedDisclosureLabelProps,
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
  return (
    <>
      <FeedDisclosureLabel {...props} hovered={useCollapsibleHovered()} />
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
