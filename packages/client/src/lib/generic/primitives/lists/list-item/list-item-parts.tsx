import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { Icon, IconRoleContext } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { useInMenu } from '../../../menu-rows-context';
import { useInSidebar } from '../../../row-drawing-context';
import { cn } from '../../../utils';
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

/*
 * Paper: a menu row's icon slot is 20px and sizes its icon with the menu role, a sidebar row's is 16 wide on its
 * title's 20 line; other rows keep the row icon slot.
 */
const leadingClasses = {
  row: 'relative h-6 w-6 wide-type:h-5 shrink-0 items-center justify-center',
  menu: 'relative h-5 w-5 shrink-0 items-center justify-center',
  sidebar: 'relative h-5 w-4 shrink-0 items-center justify-center',
};

type LeadingLane = keyof typeof leadingClasses;

const leadingIconRoles = {
  row: undefined,
  menu: 'menu',
  sidebar: undefined,
} as const satisfies Record<LeadingLane, 'menu' | undefined>;

type LeadingProps = Pick<
  ListItemProps,
  'leading' | 'badge' | 'sidebar' | 'leadingSize'
>;

function leadingLane(menu: boolean, sidebar: boolean): LeadingLane {
  if (menu) return 'menu';

  return sidebar ? 'sidebar' : 'row';
}

export function Leading(props: LeadingProps): ReactNode {
  const lane = leadingLane(useInMenu(), props.sidebar !== undefined);
  const badge = useLeadingBadge(props.badge);

  if (!hasLeading(props)) return null;

  return (
    <View className={leadingClass(lane, props.leadingSize)}>
      <IconRoleContext value={leadingIconRoles[lane]}>
        {props.leading}
      </IconRoleContext>
      <ItemBadge badge={badge} />
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

// The disclosure chevron of a row that pushes a page; Android draws none. iOS draws SF's, since the iOS asset catalog leaves out Tabler's `web-disclosure`.
export function LinkAccessory(): ReactElement | null {
  return Platform.OS === 'android' ? null : (
    <Icon
      name={Platform.OS === 'ios' ? 'disclosure' : 'web-disclosure'}
      role="disclosure"
      className="text-tertiary"
    />
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

const leadingClass = (
  lane: LeadingLane,
  size: LeadingProps['leadingSize'],
): string =>
  cn(
    leadingClasses[lane],
    size === 'avatar' && 'size-9 wide-type:size-7 self-center',
  );

export const separatorClass = (
  separator: string,
  size: ListItemProps['leadingSize'],
): string => cn(separator, size === 'avatar' && 'left-16');
