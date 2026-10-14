import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '../../../utils';
import { Text } from '../../display/text/text';
import { useSidebarFields } from '../../fields/field-layout';
import {
  type ListItemProps,
  listItemStatus,
  valueIsStatus,
} from '../../fields/field-props';
import { ListItemAccessory } from './list-item-accessory';
import { Disclosure } from './list-item-disclosure';
import { ListItemLeading } from './list-item-leading';
import {
  contentGap,
  hasDisclosure,
  rowEmphasis,
  titleClasses,
} from './list-item-styles';
import { StatusDot } from './status-dot';

export function ListItemBody(props: ListItemProps): React.JSX.Element {
  if (!props.detail) return <ListItemContent {...props} />;

  return (
    <View className="flex-1">
      <View className="min-h-13 wide:min-h-11 flex-row items-center px-4 py-3">
        <ListItemContent {...props} />
      </View>
      <View className="px-4 pb-3">{props.detail}</View>
    </View>
  );
}

function ListItemContent(props: ListItemProps): React.JSX.Element {
  const sidebar = useSidebarFields();
  const emphasis = rowEmphasis(props, sidebar);

  // The row's name already carries its text; only an accessory, such as a picker, stays reachable.
  return (
    <View className={contentClasses(props, sidebar)}>
      <ListItemLeadingSlot {...props} emphasis={emphasis} />
      <ListItemTitle {...props} />
      <ListItemTrailing {...props} emphasis={emphasis} />
    </View>
  );
}

function contentClasses(props: ListItemProps, sidebar: boolean): string {
  return cn(
    'flex-1 flex-row items-center gap-3',
    contentGap(sidebar, props.size),
    props.disabled && 'opacity-65',
  );
}

function ListItemLeadingSlot(props: TrailingProps): React.JSX.Element {
  return (
    <ListItemLeading
      icon={props.icon}
      loading={props.loading}
      leading={props.leading}
      size={props.size}
      className={props.emphasis}
    />
  );
}

function ListItemTitle(props: ListItemProps): React.JSX.Element {
  const title = (
    <Text aria-hidden role="body" className={titleClasses(props)}>
      {props.title}
    </Text>
  );

  if (!props.subtitle) return title;

  return (
    <View className="min-w-0 flex-1">
      {title}
      <ListItemSubtitle subtitle={props.subtitle} />
    </View>
  );
}

function ListItemSubtitle({
  subtitle,
}: Required<Pick<ListItemProps, 'subtitle'>>): React.JSX.Element {
  return (
    <Text
      aria-hidden
      role="secondary"
      className={cn(subtitle.code && 'type-code text-muted-foreground')}
    >
      {subtitle.text}
    </Text>
  );
}

type TrailingProps = ListItemProps & { emphasis: string };

function ListItemTrailing(props: TrailingProps): React.JSX.Element {
  const sidebar = useSidebarFields();

  return (
    <View className="max-w-[55%] flex-row items-center gap-2 wide:gap-3">
      {props.valueLeading}
      <RowValue value={props.value} className={valueClasses(props, sidebar)} />
      <StatusDot status={listItemStatus(props)} />
      <ListItemAccessory>{props.accessory}</ListItemAccessory>
      {props.control}
      <Disclosure visible={hasDisclosure(props) && !sidebar} />
    </View>
  );
}

// A phone row shows a status value as its dot alone.
const valueClasses = (props: TrailingProps, sidebar: boolean): string =>
  cn(
    sidebar ? props.emphasis : 'text-muted-foreground',
    valueIsStatus(props) && 'hidden wide:flex',
  );

function RowValue({
  value,
  className,
}: Pick<ListItemProps, 'value'> & {
  className: string;
}): React.JSX.Element | null {
  if (value === undefined) return null;

  return (
    <Text aria-hidden role="body" className={cn('shrink', className)}>
      {value}
    </Text>
  );
}
