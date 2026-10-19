import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { Icon, IconRoleContext } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { CountBadge } from '#primitives/status/count-badge';
import { StatusDot } from '#primitives/status/status-dot';
import { useInMenu } from '../../../menu-rows-context';
import type { ListItemProps, RowBadge } from './list-item-props';

// A Row badge at the top-end corner of the view it sits in, such as a row's leading icon or a header button.
export function ItemBadge({ badge }: Pick<ListItemProps, 'badge'>): ReactNode {
  if (badge === undefined) return null;

  return (
    <View className="absolute -right-1 -top-1">{renderRowBadge(badge)}</View>
  );
}

function renderRowBadge(
  badge: NonNullable<ListItemProps['badge']>,
): ReactElement {
  if (typeof badge === 'number') return <CountBadge badge={{ count: badge }} />;

  if (badge.kind === 'count')
    return <CountBadge badge={{ count: badge.count, label: badge.label }} />;

  return <RowStatus badge={badge} />;
}

function RowStatus({
  badge,
}: {
  badge: Extract<RowBadge, { kind: 'status' }>;
}): ReactElement {
  return (
    <View className="rounded-full bg-card p-0.5">
      <StatusDot
        tone={badge.tone}
        pulse={badge.pulse}
        accessibilityLabel={badge.label}
      />
    </View>
  );
}

function hasBadge(badge: ListItemProps['badge']): boolean {
  return badge !== undefined && hasBadgeContent(badge);
}

function hasBadgeContent(badge: NonNullable<ListItemProps['badge']>): boolean {
  if (typeof badge === 'number') return badge > 0;

  return badge.kind !== 'count' || badge.count > 0;
}

export function hasLeading(
  props: Pick<ListItemProps, 'leading' | 'badge'>,
): boolean {
  return [Boolean(props.leading), hasBadge(props.badge)].some(Boolean);
}

// Paper: a menu row's icon slot is 20px and sizes its icon with the menu role; other rows keep the row icon slot.
const leadingClasses = {
  row: 'relative h-6 w-6 wide-type:h-5 shrink-0 items-center justify-center',
  menu: 'relative h-5 w-5 shrink-0 items-center justify-center',
};

const leadingIconRoles = { row: undefined, menu: 'menu' } as const;

export function Leading(
  props: Pick<ListItemProps, 'leading' | 'badge'>,
): ReactNode {
  const lane = useInMenu() ? 'menu' : 'row';

  if (!hasLeading(props)) return null;

  return (
    <View className={leadingClasses[lane]}>
      <IconRoleContext value={leadingIconRoles[lane]}>
        {props.leading}
      </IconRoleContext>
      <ItemBadge badge={props.badge} />
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

function trailingContent(
  props: Pick<ListItemProps, 'trailing' | 'value'>,
): ReactNode {
  return props.value === undefined ? (
    props.trailing
  ) : (
    <View className="flex-row items-center gap-3">
      <Text role="row" tone="muted">
        {props.value}
      </Text>
      {props.trailing}
    </View>
  );
}

export function Trailing(
  props: Pick<ListItemProps, 'trailing' | 'value'>,
): ReactNode {
  const content = trailingContent(props);

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

// Paper: a control under the row's title and value spans the row's content width, on its own line.
export function Control({ children }: { children?: ReactNode }): ReactNode {
  return children ? <View className="w-full">{children}</View> : null;
}
