import type * as React from 'react';
import { useContext } from 'react';
import { Pressable, View } from 'react-native';
import { Chevron } from '../../../symbols/chevron';
import { cn } from '../../../utils';
import { Text } from '../../display/text/text';
import {
  FieldRowEnd,
  useNavigationFields,
  useSidebarFields,
} from '../../fields/field-layout';
import {
  type ListItemProps,
  listItemName,
  listItemStatus,
} from '../../fields/field-props';
import { ListItemAccessory } from './list-item-accessory';
import { ListItemLeading } from './list-item-leading';
import {
  contentGap,
  hasDisclosure,
  rowClasses,
  rowEmphasis,
  titleClasses,
} from './list-item-styles';
import { StatusDot } from './status-dot';
import { isModifiedClick } from './web-row-link';

export function ListItem(props: ListItemProps): React.JSX.Element {
  const navigation = useNavigationFields();
  const rowProps = {
    accessibilityLabel: listItemName(props),
    accessibilityState: { disabled: !!props.disabled },
    'aria-current': props.selected ? ('page' as const) : undefined,
    className: rowClasses(props, navigation, useContext(FieldRowEnd)),
  };
  const content = <ListItemContent {...props} />;
  if (!props.onPress)
    return (
      <View {...rowProps} role="group">
        {content}
      </View>
    );
  return (
    <Pressable {...linkProps(props)} {...rowProps} disabled={props.disabled}>
      {content}
    </Pressable>
  );
}

function linkProps(
  props: ListItemProps,
): React.ComponentProps<typeof Pressable> & { href?: string } {
  if (!props.onPress) return {};
  return {
    role: 'link',
    href: props.href ?? '#',
    onPress: (event) => {
      if (isModifiedClick(event)) return;
      event.preventDefault();
      props.onPress?.();
    },
  };
}

function ListItemContent(props: ListItemProps): React.JSX.Element {
  const sidebar = useSidebarFields();
  const emphasis = rowEmphasis(props, sidebar);
  // The row's name already carries its text; only an accessory, such as a picker, stays reachable.
  return (
    <View
      className={cn(
        'flex-1 flex-row items-center gap-3',
        contentGap(sidebar, props.size),
        props.disabled && 'opacity-65',
      )}
    >
      <ListItemLeading
        icon={props.icon}
        loading={props.loading}
        leading={props.leading}
        size={props.size}
        className={emphasis}
      />
      <ListItemTitle {...props} />
      <ListItemTrailing {...props} emphasis={emphasis} />
    </View>
  );
}

function ListItemTitle(props: ListItemProps): React.JSX.Element {
  const title = (
    <Text
      aria-hidden
      role="body"
      numberOfLines={1}
      className={titleClasses(props)}
    >
      {props.title}
    </Text>
  );
  if (!props.subtitle) return title;
  return (
    <View className="min-w-0 flex-1">
      {title}
      <Text
        aria-hidden
        role="secondary"
        numberOfLines={1}
        className={cn(props.subtitle.code && 'type-code text-muted-foreground')}
      >
        {props.subtitle.text}
      </Text>
    </View>
  );
}

function ListItemTrailing(
  props: ListItemProps & { emphasis: string },
): React.JSX.Element {
  const sidebar = useSidebarFields();
  const valueColor = sidebar ? props.emphasis : 'text-muted-foreground';
  return (
    <View className="max-w-[55%] flex-row items-center gap-2 wide:gap-3">
      <RowValue value={props.value} className={valueColor} />
      <StatusDot status={listItemStatus(props)} />
      <ListItemAccessory>{props.accessory}</ListItemAccessory>
      <Disclosure visible={hasDisclosure(props) && !sidebar} />
    </View>
  );
}

function Disclosure({
  visible,
}: {
  visible: boolean;
}): React.JSX.Element | null {
  return visible ? (
    <Chevron name="chevron-right" className="text-muted-foreground shrink-0" />
  ) : null;
}

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
