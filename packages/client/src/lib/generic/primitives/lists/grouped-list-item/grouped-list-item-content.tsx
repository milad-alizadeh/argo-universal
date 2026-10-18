import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { useWideSidebarList } from '#primitives/fields/field-layout';
import { cn } from '../../../utils';
import { GroupedListItemAccessory } from './grouped-list-item-accessory';
import { GroupedListItemDetail } from './grouped-list-item-detail';
import { Disclosure } from './grouped-list-item-disclosure';
import {
  type RowLanePlace,
  rowLane,
  useRowLanePlace,
} from './grouped-list-item-lane';
import { GroupedListItemLeading } from './grouped-list-item-leading';
import {
  type ResolvedItemProps,
  groupedListItemStatus,
} from './grouped-list-item-props';
import {
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
    <View className={contentClasses(props, useRowLanePlace())}>
      <GroupedListItemLeadingSlot {...props} emphasis={emphasis} />
      <GroupedListItemTitle {...props} />
      <GroupedListItemTrailing {...props} emphasis={emphasis} />
    </View>
  );
}

function contentClasses(props: ResolvedItemProps, place: RowLanePlace): string {
  return cn(
    'flex-1 flex-row items-center',
    rowLane(props, place).gap,
    props.variant === 'card' && 'items-start',
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
      role={subtitle.code ? 'secondary-code' : 'secondary'}
      numberOfLines={subtitle.numberOfLines}
    >
      {subtitle.text}
    </Text>
  );
}

type TrailingProps = ResolvedItemProps & { emphasis: string };

// A grouped row's chevron sits 14 after the value, as iOS's does; its box's own air makes up 6 of it.
function GroupedListItemTrailing(props: TrailingProps): React.JSX.Element {
  const place = useRowLanePlace();

  return (
    <View className={trailingClasses(place)}>
      <RowSelection {...props} />
      <StatusDot status={groupedListItemStatus(props)} />
      <GroupedListItemAccessory>{props.accessory}</GroupedListItemAccessory>
      {props.control}
      <Disclosure visible={hasDisclosure(props)} place={place} />
    </View>
  );
}

const trailingClasses = (place: RowLanePlace): string =>
  cn(
    'max-w-11/20 flex-row items-center gap-2',
    place !== 'grouped' && 'wide:gap-3',
  );

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
