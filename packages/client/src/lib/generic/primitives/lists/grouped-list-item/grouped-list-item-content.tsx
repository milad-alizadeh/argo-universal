import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import {
  useOverlayList,
  useWideSidebarList,
} from '#primitives/fields/field-layout';
import { cn } from '../../../utils';
import { GroupedListItemAccessory } from './grouped-list-item-accessory';
import { GroupedListItemDetail } from './grouped-list-item-detail';
import { Disclosure } from './grouped-list-item-disclosure';
import { GroupedListItemLeading } from './grouped-list-item-leading';
import {
  type GroupedListItemProps,
  groupedListItemStatus,
} from './grouped-list-item-props';
import {
  contentGap,
  hasDisclosure,
  rowEmphasis,
  stacksValue,
  titleClasses,
} from './grouped-list-item-styles';
import { OverlayRowTitle } from './overlay-row-title';
import { StatusDot } from './status-dot';

export function GroupedListItemBody(
  props: GroupedListItemProps,
): React.JSX.Element {
  if (!props.detail) return <GroupedListItemContent {...props} />;

  return (
    <GroupedListItemDetail detail={props.detail}>
      <GroupedListItemContent {...props} />
    </GroupedListItemDetail>
  );
}

function GroupedListItemContent(
  props: GroupedListItemProps,
): React.JSX.Element {
  const sidebar = useWideSidebarList();
  const emphasis = rowEmphasis(props, sidebar);

  // The row's name already carries its text; only an accessory, such as a picker, stays reachable.
  return (
    <View className={contentClasses(props, sidebar)}>
      <GroupedListItemLeadingSlot {...props} emphasis={emphasis} />
      <GroupedListItemTitle {...props} />
      <GroupedListItemTrailing {...props} emphasis={emphasis} />
    </View>
  );
}

function contentClasses(props: GroupedListItemProps, sidebar: boolean): string {
  return cn(
    'flex-1 flex-row items-center gap-3',
    contentGap(sidebar, props.size),
    props.disabled && 'opacity-65',
  );
}

function GroupedListItemLeadingSlot(props: TrailingProps): React.JSX.Element {
  return (
    <GroupedListItemLeading
      icon={props.icon}
      loading={props.loading}
      leading={props.leading}
      size={props.size}
      className={props.emphasis}
    />
  );
}

function GroupedListItemTitle(props: GroupedListItemProps): React.JSX.Element {
  const overlay = useOverlayList();

  return stacksValue(props, overlay) ? (
    <OverlayRowTitle {...props} />
  ) : (
    <PlainRowTitle {...props} />
  );
}

function PlainRowTitle(props: GroupedListItemProps): React.JSX.Element {
  const title = (
    <Text aria-hidden role="body" className={titleClasses(props)}>
      {props.label}
    </Text>
  );

  if (!props.subtitle) return title;

  return (
    <View className="min-w-0 flex-1">
      {title}
      <GroupedListItemSubtitle subtitle={props.subtitle} />
    </View>
  );
}

function GroupedListItemSubtitle({
  subtitle,
}: Required<Pick<GroupedListItemProps, 'subtitle'>>): React.JSX.Element {
  return (
    <Text
      aria-hidden
      role="secondary"
      numberOfLines={subtitle.numberOfLines}
      className={cn(subtitle.code && 'type-code text-muted-foreground')}
    >
      {subtitle.text}
    </Text>
  );
}

type TrailingProps = GroupedListItemProps & { emphasis: string };

function GroupedListItemTrailing(props: TrailingProps): React.JSX.Element {
  const sidebar = useWideSidebarList();

  return (
    <View className="max-w-[55%] flex-row items-center gap-2 wide:gap-3">
      <RowSelection {...props} />
      <StatusDot status={groupedListItemStatus(props)} />
      <GroupedListItemAccessory>{props.accessory}</GroupedListItemAccessory>
      {props.control}
      <Disclosure visible={hasDisclosure(props) && !sidebar} />
    </View>
  );
}

function RowSelection(props: TrailingProps): React.JSX.Element | null {
  const sidebar = useWideSidebarList();
  const overlay = useOverlayList();

  if (stacksValue(props, overlay)) return null;

  return (
    <>
      {props.valueLeading}
      <RowValue
        value={props.value}
        className={sidebar ? props.emphasis : 'text-muted-foreground'}
      />
    </>
  );
}

function RowValue({
  value,
  className,
}: Pick<GroupedListItemProps, 'value'> & {
  className: string;
}): React.JSX.Element | null {
  if (value === undefined) return null;

  return (
    <Text aria-hidden role="body" className={cn('shrink', className)}>
      {value}
    </Text>
  );
}
