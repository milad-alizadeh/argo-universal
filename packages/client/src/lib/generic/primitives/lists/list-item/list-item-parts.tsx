import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { CountBadge } from '#primitives/status/count-badge';
import type { ListItemProps } from './list-item-props';

function ItemBadge({ badge }: Pick<ListItemProps, 'badge'>): ReactNode {
  if (badge === undefined) return null;

  return (
    <View className="absolute -right-1 -top-1">
      <CountBadge badge={{ count: badge }} />
    </View>
  );
}

export function hasLeading(
  props: Pick<ListItemProps, 'leading' | 'badge'>,
): boolean {
  return [Boolean(props.leading), (props.badge ?? 0) > 0].some(Boolean);
}

export function Leading(
  props: Pick<ListItemProps, 'leading' | 'badge'>,
): ReactNode {
  if (!hasLeading(props)) return null;

  return (
    <View className="relative size-6 shrink-0 items-center justify-center wide-type:size-5">
      {props.leading}
      <ItemBadge badge={props.badge} />
    </View>
  );
}

function Subtitle({ text }: { text?: string }): ReactNode {
  return text === undefined ? null : (
    <Text role="row-detail" tone="muted" numberOfLines={1}>
      {text}
    </Text>
  );
}

function Meta({ children }: { children?: ReactNode }): ReactNode {
  return children ? (
    <View className="min-w-0 flex-row items-center gap-3 pt-1">{children}</View>
  ) : null;
}

export function ItemContent(props: ListItemProps): ReactElement {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <Text role="row" numberOfLines={1}>
        {props.title}
      </Text>
      <Subtitle text={props.subtitle} />
      <Meta>{props.meta}</Meta>
    </View>
  );
}

function trailingContent(
  props: Pick<ListItemProps, 'trailing' | 'value'>,
): ReactNode {
  return props.value === undefined ? (
    props.trailing
  ) : (
    <Text role="row" tone="muted">
      {props.value}
    </Text>
  );
}

export function Trailing(
  props: Pick<ListItemProps, 'trailing' | 'value'>,
): ReactNode {
  const content = trailingContent(props);

  return content === undefined ? null : (
    <View className="shrink-0 flex-row items-start justify-end gap-1">
      {content}
    </View>
  );
}

export function Accessory({ children }: { children?: ReactNode }): ReactNode {
  return children ? (
    <View className="size-6 shrink-0 items-center justify-center self-center wide-type:size-5">
      {children}
    </View>
  ) : null;
}
