import type * as React from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '../symbols/icon';
import { cn } from '../utils';
import { useNavigationFields } from './field-layout';
import { type ListItemProps, listItemName } from './field-props';
import { Text } from './text';
import { isModifiedClick } from './web-row-link';

export function ListItem(props: ListItemProps): React.JSX.Element {
  const navigation = useNavigationFields();
  return (
    <Pressable
      {...linkProps(props)}
      accessibilityLabel={listItemName(props)}
      accessibilityState={{ disabled: !!props.disabled }}
      aria-current={props.selected ? 'page' : undefined}
      disabled={props.disabled}
      className={rowClasses(props, navigation)}
    >
      <ListItemContent {...props} />
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
    'relative min-h-[52px] flex-row items-center gap-3 px-4 py-3 web:hover:bg-border web:active:bg-border web:focus-visible:outline-2 web:focus-visible:outline-ring web:focus-visible:-outline-offset-2',
    separatorClasses(props, navigation),
    navigation && 'min-h-8 rounded-md gap-2 py-1.5 pl-2.5 pr-2',
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
      <RowIcon icon={props.icon} />
      <Text
        role="body"
        className={cn('min-w-0 flex-1', props.selected && 'font-medium')}
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
      <Attention visible={props.needsAttention} />
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

function RowIcon({
  icon,
}: Pick<ListItemProps, 'icon'>): React.JSX.Element | null {
  return icon ? <Icon name={icon} className="shrink-0" /> : null;
}

function Attention({
  visible,
}: {
  visible?: boolean;
}): React.JSX.Element | null {
  return visible ? (
    <View className="size-2 shrink-0 rounded-full bg-warning wide:size-1.5" />
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
      size="sm"
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
      'web:after:absolute web:after:bottom-0 web:after:right-4 web:after:left-4 web:after:h-px web:after:bg-border web:last:after:hidden',
      props.icon && 'web:after:left-11',
    )
  );
}

function RowValue({
  value,
}: Pick<ListItemProps, 'value'>): React.JSX.Element | null {
  const navigation = useNavigationFields();
  if (value === undefined) return null;
  return (
    <Text
      role={navigation ? 'secondary' : 'body'}
      className="text-muted-foreground shrink"
    >
      {value}
    </Text>
  );
}
