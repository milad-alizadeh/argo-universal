import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import {
  Icon,
  IconSizeContext,
  type IconSizing,
} from '#primitives/content/icon';
import { useCompactRows, useListLook } from '../../../list-look-context';
import { hasBadge, ItemBadge, useLeadingBadge } from '../../../row-badge';
import { StatusMarkHidden } from '../../../status-mark-context';
import { rowGlyphSize } from '../../../symbols/row-glyph';
import { cn } from '../../../utils';
import { useInertLane } from './list-item-pass-through';
import type { ListItemProps } from './list-item-props';

export function hasLeading(
  props: Pick<ListItemProps, 'leading' | 'badge'>,
): boolean {
  return [Boolean(props.leading), hasBadge(props.badge)].some(Boolean);
}

/*
 * Paper: a menu row's icon slot is 20px and sizes its icon with the menu role, a sidebar row's and a compact row's
 * is 16 wide on its title's 20 line; other rows keep the row icon slot.
 */
const leadingClasses = {
  row: 'relative h-6 w-6 wide-type:h-5 shrink-0 items-center justify-center',
  menu: 'relative h-5 w-5 shrink-0 items-center justify-center',
  sidebar: 'relative h-5 w-4 shrink-0 items-center justify-center',
};

type LeadingLane = keyof typeof leadingClasses;

/*
 * One icon size per lane, fixed, so every row in a list presents the same glyph however its call site writes its
 * icon: a row's leading glyph takes the row glyph role a Settings row takes, and draws in that row's lane so the two
 * kinds of row present the same glyph (row-glyph.ts); a menu row takes the menu role, and a sidebar or compact row's
 * narrower lane takes the size that fits it. An avatar is not a glyph and sizes itself with its own lane.
 */
const leadingIconSizes = {
  row: { size: rowGlyphSize, fixed: true, lane: 'row' },
  menu: { size: 'md', fixed: true },
  sidebar: { size: 'sm', fixed: true },
} as const satisfies Record<LeadingLane, IconSizing>;

type LeadingProps = Pick<
  ListItemProps,
  'leading' | 'badge' | 'sidebar' | 'leadingSize'
>;

function leadingLane(menu: boolean, sidebar: boolean): LeadingLane {
  if (menu) return 'menu';

  return sidebar ? 'sidebar' : 'row';
}

function useLeadingLane(sidebar: boolean | undefined): LeadingLane {
  const compact = useCompactRows(sidebar);

  return leadingLane(useListLook().menu, sidebar === true || compact);
}

// The leading lane holds no accessory, so a row with accessories lets its presses through.
function LeadingFrame(props: {
  className: string;
  children: ReactNode;
}): ReactElement {
  return <View {...useInertLane()} {...props} />;
}

export function Leading(props: LeadingProps): ReactNode {
  const lane = useLeadingLane(props.sidebar);
  const badge = useLeadingBadge(props.badge);

  if (!hasLeading(props)) return null;

  return (
    <LeadingFrame className={leadingClass(lane, props.leadingSize)}>
      <IconSizeContext value={laneSizing(lane, props.leadingSize)}>
        <StatusMarkHidden value={hasBadge(props.badge)}>
          {props.leading}
        </StatusMarkHidden>
      </IconSizeContext>
      <ItemBadge badge={badge} />
    </LeadingFrame>
  );
}

const laneSizing = (
  lane: LeadingLane,
  size: LeadingProps['leadingSize'],
): IconSizing | undefined =>
  size === 'avatar' ? undefined : leadingIconSizes[lane];

export function Accessory({ children }: { children?: ReactNode }): ReactNode {
  const inert = useInertLane();

  return children ? (
    <View
      {...inert}
      className="h-6 min-w-6 wide-type:h-5 wide-type:min-w-5 shrink-0 items-center justify-center self-center"
    >
      {children}
    </View>
  ) : null;
}

/*
 * The disclosure chevron of a row that pushes a page, as its List look draws it; Android draws none. The two glyphs
 * fill their boxes differently, so each takes the role that lands it on the same 12pt chevron beside the title: SF's
 * inks most of its point size and takes the chevron role, while the SVG `web-disclosure` is drawn inside its 24-point
 * box and takes the full disclosure slot.
 */
export function LinkAccessory(): ReactElement | null {
  const { chevron } = useListLook();

  if (chevron === undefined) return null;

  return chevron === 'disclosure' ? (
    <Icon name="disclosure" className="text-tertiary" />
  ) : (
    <Icon name="web-disclosure" size="md" className="text-tertiary" />
  );
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
