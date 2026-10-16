import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import { useWideSidebarList } from '#primitives/fields/field-layout';
import { cn } from '../../../utils';
import { GroupedListItemAccessory } from './grouped-list-item-accessory';
import { GroupedListItemDetail } from './grouped-list-item-detail';
import { Disclosure } from './grouped-list-item-disclosure';
import { GroupedListItemLeading } from './grouped-list-item-leading';
import {
  type ResolvedItemProps,
  groupedListItemStatus,
} from './grouped-list-item-props';
import {
  contentGap,
  hasDisclosure,
  rowEmphasis,
  titleClasses,
} from './grouped-list-item-styles';
import { StatusDot } from './status-dot';

export function GroupedListItemBody(
  props: ResolvedItemProps,
): React.JSX.Element {
  if (!props.detail) return <GroupedListItemContent {...props} />;

  return (
    <GroupedListItemDetail detail={props.detail}>
      <GroupedListItemContent {...props} />
    </GroupedListItemDetail>
  );
}

function GroupedListItemContent(props: ResolvedItemProps): React.JSX.Element {
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

function contentClasses(props: ResolvedItemProps, sidebar: boolean): string {
  return cn(
    'flex-1 flex-row items-center gap-3',
    contentGap(sidebar, props.size),
    props.variant === 'card' && 'items-start wide:gap-3',
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
      variant={props.variant}
      className={props.emphasis}
    />
  );
}

function GroupedListItemTitle(props: ResolvedItemProps): React.JSX.Element {
  const title = <RowTitleLabel {...props} />;

  if (!props.subtitle) return title;

  return (
    <View className={cn('min-w-0 flex-1', props.variant === 'card' && 'gap-1')}>
      {title}
      <GroupedListItemSubtitle subtitle={props.subtitle} />
      {props.footer}
    </View>
  );
}

function GroupedListItemSubtitle({
  subtitle,
}: Required<Pick<ResolvedItemProps, 'subtitle'>>): React.JSX.Element {
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

type TrailingProps = ResolvedItemProps & { emphasis: string };

function GroupedListItemTrailing(props: TrailingProps): React.JSX.Element {
  const sidebar = useWideSidebarList();

  return (
    <View className="max-w-11/20 flex-row items-center gap-2 wide:gap-3">
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
}: Pick<ResolvedItemProps, 'value'> & {
  className: string;
}): React.JSX.Element | null {
  if (value === undefined) return null;

  return (
    <Text aria-hidden role="body" className={cn('shrink', className)}>
      {value}
    </Text>
  );
}

function RowTitleLabel(props: ResolvedItemProps): React.JSX.Element {
  return (
    <Text aria-hidden role="body" className={titleClasses(props)}>
      {props.label}
      {props.labelDetail && (
        <Text role="secondary" tone="muted">
          {' '}
          {props.labelDetail}
        </Text>
      )}
    </Text>
  );
}
