import { Icon, IconSlot } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleHeader,
  useCollapsibleHovered,
} from '@repo/kit/primitives/layout/collapsible';
import type { IconName } from '@repo/kit/symbols/icon-names';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import {
  FeedDisclosureLabel,
  type FeedDisclosureLabelProps,
} from './feed-disclosure-label';
import { useDisclosureOpen } from './feed-disclosure-state';
import { ShimmerDisclosureTitle } from './shimmer-disclosure-title';

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
  // The identity of a group whose header can stay mounted in a recycled cell.
  entryKey?: string;
  // Drawn at the far end of the header row, outside the trigger, so it can take its own taps.
  aside?: ReactNode;
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

function feedDisclosureIcon(
  props: Pick<FeedDisclosureProps, 'icon' | 'failed'>,
): ReactNode {
  if (!props.icon) return undefined;

  return (
    <IconSlot size="sm">
      <Icon name={props.icon} className={cn({ 'text-danger': props.failed })} />
    </IconSlot>
  );
}

function shouldShimmer(props: Omit<FeedDisclosureProps, 'children'>): boolean {
  if (!props.running || props.awaitingApproval) return false;

  return !props.title;
}

function titleRenderer(
  props: Omit<FeedDisclosureProps, 'children'>,
): ((chevron: ReactNode) => ReactNode) | undefined {
  if (!shouldShimmer(props)) return undefined;

  const text = props.trailing
    ? `${props.label} ${props.trailing}`
    : props.label;

  return (chevron) => <ShimmerDisclosureTitle text={text} chevron={chevron} />;
}

function FeedDisclosureHeader(
  props: Omit<FeedDisclosureProps, 'children'>,
): React.JSX.Element {
  return (
    <CollapsibleHeader
      label={props.label}
      leading={props.leading ?? feedDisclosureIcon(props)}
      renderTitle={titleRenderer(props)}
    >
      <FeedDisclosureTitle {...props} />
    </CollapsibleHeader>
  );
}

function FeedDisclosureHeaderRow({
  aside,
  ...props
}: Omit<FeedDisclosureProps, 'children'>): React.JSX.Element {
  if (!aside) return <FeedDisclosureHeader {...props} />;

  return (
    <View className="flex-row items-center gap-2">
      <View className="min-w-0 shrink">
        <FeedDisclosureHeader {...props} />
      </View>
      <View className="ml-auto shrink-0 flex-row items-center">{aside}</View>
    </View>
  );
}

export function FeedDisclosure(props: FeedDisclosureProps): React.JSX.Element {
  const { children, ...header } = props;
  const { bodyKey, ...open } = useDisclosureOpen(props);

  return (
    <Collapsible {...open} className="w-full">
      <FeedDisclosureHeaderRow {...header} />
      <CollapsibleContent key={bodyKey} className="pt-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
