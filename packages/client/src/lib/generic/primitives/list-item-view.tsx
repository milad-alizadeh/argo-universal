import type * as React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Icon } from '../symbols/icon';
import { useWide } from '../use-wide';
import { cn } from '../utils';
import { useNavigationFields } from './field-layout';
import {
  type ListItemProps,
  listItemName,
  listItemStatus,
} from './field-props';
import { StatusDot } from './status-dot';
import { Text } from './text';
import { isModifiedClick } from './web-row-link';

export function ListItem(props: ListItemProps): React.JSX.Element {
  const navigation = useNavigationFields();
  const rowProps = {
    accessibilityLabel: listItemName(props),
    accessibilityState: { disabled: !!props.disabled },
    'aria-current': props.selected ? ('page' as const) : undefined,
    className: rowClasses(props, navigation),
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

function rowClasses(props: ListItemProps, navigation: boolean): string {
  return cn(
    'relative min-h-[52px] flex-row items-center gap-3 px-4 py-3 bg-muted',
    props.onPress &&
      'web:hover:bg-border web:active:bg-border web:focus-visible:outline-2 web:focus-visible:outline-ring web:focus-visible:-outline-offset-2',
    separatorClasses(props, navigation),
    navigation && 'min-h-8 rounded-md gap-2 py-1.5 pl-2.5 pr-2 bg-transparent',
    selectionClass(props, navigation),
  );
}

function ListItemContent(props: ListItemProps): React.JSX.Element {
  return (
    <View
      aria-hidden
      className={cn(
        'flex-1 flex-row items-center gap-3 wide:gap-2',
        props.disabled && 'opacity-65',
      )}
    >
      <RowLeading {...props} />
      <Text
        role="body"
        className={cn(
          'min-w-0 flex-1',
          props.destructive && 'text-destructive',
        )}
      >
        {props.title}
      </Text>
      <ListItemTrailing {...props} />
    </View>
  );
}

function ListItemTrailing(props: ListItemProps): React.JSX.Element {
  const navigation = useNavigationFields();
  return (
    <View className="max-w-[55%] flex-row items-center gap-2">
      <RowValue value={props.value} />
      <StatusDot status={listItemStatus(props)} />
      {props.accessory}
      <Disclosure visible={!!props.onPress && !navigation} />
    </View>
  );
}

function selectionClass(
  props: ListItemProps,
  navigation: boolean,
): string | false | undefined {
  return navigation && props.selected && 'bg-border';
}

function RowLeading({
  icon,
  loading,
}: Pick<ListItemProps, 'icon' | 'loading'>): React.JSX.Element | null {
  if (loading) return <ActivityIndicator className="shrink-0" />;
  return <RowIcon icon={icon} />;
}

function RowIcon({
  icon,
}: Pick<ListItemProps, 'icon'>): React.JSX.Element | null {
  const wide = useWide();
  return icon ? (
    <Icon name={icon} size={wide ? 'md' : 'lg'} className="shrink-0" />
  ) : null;
}

function Disclosure({
  visible,
}: {
  visible: boolean;
}): React.JSX.Element | null {
  return visible ? (
    <Icon
      name="chevron-right"
      size="xs"
      className="text-muted-foreground/50 shrink-0"
    />
  ) : null;
}

function separatorClasses(
  props: ListItemProps,
  navigation: boolean,
): string | false {
  return (
    !navigation &&
    cn(
      'web:after:absolute web:after:bottom-0 web:after:right-4 web:after:left-4 web:after:h-px web:after:bg-[var(--color-separator)] web:last:after:hidden',
      props.icon && 'web:after:left-13 wide:web:after:left-11',
    )
  );
}

function RowValue({
  value,
}: Pick<ListItemProps, 'value'>): React.JSX.Element | null {
  if (value === undefined) return null;
  return (
    <Text role="body" className="text-muted-foreground shrink">
      {value}
    </Text>
  );
}
