import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { useInMenu } from '../../../menu-rows-context';
import { useInSidebar } from '../../../row-drawing-context';
import {
  hasBadge,
  ItemBadge,
  sidebarStatus,
  useLeadingBadge,
} from './list-item-badge';
import type { ListItemProps } from './list-item-props';

export function hasLeading(
  props: Pick<ListItemProps, 'leading' | 'badge'>,
): boolean {
  return [Boolean(props.leading), hasBadge(props.badge)].some(Boolean);
}

// Paper: a menu row's icon slot is 20px; other rows keep the row icon slot.
const leadingClasses = {
  row: 'relative h-6 w-6 wide-type:h-5 shrink-0 items-center justify-center',
  menu: 'relative h-5 w-5 shrink-0 items-center justify-center',
};

export function Leading(
  props: Pick<ListItemProps, 'leading' | 'badge'>,
): ReactNode {
  const menu = useInMenu();
  const badge = useLeadingBadge(props.badge);

  if (!hasLeading(props)) return null;

  return (
    <View className={leadingClasses[menu ? 'menu' : 'row']}>
      {props.leading}
      <ItemBadge badge={badge} />
    </View>
  );
}

type SubtitleProps = { text?: string; multiline?: boolean };

function Subtitle({ text, multiline }: SubtitleProps): ReactNode {
  return text === undefined ? null : (
    <Text
      role="row-detail"
      tone="muted"
      numberOfLines={multiline ? undefined : 1}
    >
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
      <Text role="row" tone={props.tone} numberOfLines={1}>
        {props.title}
      </Text>
      <Subtitle text={props.subtitle} multiline={!!props.description} />
      <Meta>{props.meta}</Meta>
    </View>
  );
}

type TrailingProps = Pick<
  ListItemProps,
  'trailing' | 'value' | 'badge' | 'valueTone'
>;

function trailingContent(props: TrailingProps): ReactNode {
  return props.value === undefined ? (
    props.trailing
  ) : (
    <View className="flex-row items-center gap-3">
      <Text role="row" tone={props.valueTone ?? 'muted'}>
        {props.value}
      </Text>
      {props.trailing}
    </View>
  );
}

function useTrailingContent(props: TrailingProps): ReactNode {
  const content = trailingContent(props);
  const status = useInSidebar() ? sidebarStatus(props.badge) : undefined;

  if (status === undefined) return content;

  return (
    <View className="flex-row items-center gap-3">
      {content}
      {status}
    </View>
  );
}

export function Trailing(props: TrailingProps): ReactNode {
  const content = useTrailingContent(props);

  return content === undefined ? null : (
    <View className="h-6 wide-type:h-5 shrink-0 flex-row items-center justify-end gap-1">
      {content}
    </View>
  );
}

export function Accessory({ children }: { children?: ReactNode }): ReactNode {
  return children ? (
    <View className="h-6 min-w-6 wide-type:h-5 wide-type:min-w-5 shrink-0 items-center justify-center self-center">
      {children}
    </View>
  ) : null;
}

// The disclosure chevron of a row that pushes a page; Android draws none.
export function LinkAccessory(): ReactElement | null {
  return Platform.OS === 'android' ? null : (
    <Icon name="web-disclosure" role="disclosure" className="text-tertiary" />
  );
}

// A desktop sidebar's rows push no chevron, so its accessory lane stays empty.
export function useLinkAccessory(): ReactElement | undefined {
  return useInSidebar() ? undefined : <LinkAccessory />;
}

// Paper: a control under the row's title and value spans the row's content width, on its own line.
export function Control({ children }: { children?: ReactNode }): ReactNode {
  return children ? <View className="w-full">{children}</View> : null;
}
