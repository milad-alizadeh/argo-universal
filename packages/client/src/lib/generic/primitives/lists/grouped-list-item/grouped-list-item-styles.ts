import { toneClass } from '#primitives/content/text';
import { cn } from '../../../utils';
import { isGroupedRow, rowFrameClasses } from './grouped-list-item-frame';
import { rowLane } from './grouped-list-item-lane';
import type { ResolvedItemProps } from './grouped-list-item-props';

interface Corners {
  first: boolean;
  last: boolean;
}

// A virtualised list says whether the row ends its section, and a card's row where it sits in its card; elsewhere the last child ends it.
export interface RowPlace {
  overlay?: boolean;
  endsSection?: boolean;
  corners?: Corners;
  // The row below is hovered or pressed, and its shade meets the line between them.
  separatorHidden?: boolean;
}

export function rowClasses(
  props: ResolvedItemProps,
  sidebar: boolean,
  place: RowPlace = {},
): string {
  return cn(
    'relative flex-row items-center bg-card web:select-none web:**:select-none',
    rowFrameClasses(props, isGroupedRow(props, sidebar, place.overlay)),
    rowSizeClasses(props),
    stateClasses(props, sidebar),
    cornerClasses(place.corners),
    edgeClasses(props, sidebar, place),
    overlayClasses(props, place.overlay),
  );
}

const rowSizeClasses = (props: ResolvedItemProps): string =>
  cn(sizeClasses(props), props.variant === 'card' && 'py-3 wide:py-3');

// A row with a control below, such as Effort, pads 8 all round like its neighbours.
const overlayClasses = (
  props: Pick<ResolvedItemProps, 'detail'>,
  overlay: boolean | undefined,
): string | undefined =>
  overlay
    ? cn(
        'bg-card rounded-xl min-h-9 wide:min-h-9 px-2 py-2 web:hover:bg-hover web:active:bg-pressed',
        props.detail && 'wide:py-2',
      )
    : undefined;

// A sidebar row has no separator, and neither has the row that ends its section.
function edgeClasses(
  props: ResolvedItemProps,
  sidebar: boolean,
  place: RowPlace,
): string | undefined {
  if (place.overlay) return undefined;

  if (sidebar) return sidebarClasses(props);

  return sectionEdge(props, place);
}

function sectionEdge(
  props: ResolvedItemProps,
  place: RowPlace,
): string | undefined {
  return place.endsSection === true
    ? undefined
    : separatorClasses(props, place);
}

// A card's rows round their own corners.
const cornerClasses = (corners: Corners | undefined): string =>
  cn(topCorners(corners), bottomCorners(corners));

const topCorners = (corners: Corners | undefined): string | undefined =>
  corners?.first ? 'rounded-t-3xl' : undefined;

const bottomCorners = (corners: Corners | undefined): string | undefined =>
  corners?.last ? 'rounded-b-3xl' : undefined;

// A large row pads 16 all round at every width; a small one is 36 tall on a wide window.
function sizeClasses(props: ResolvedItemProps): string | undefined {
  if (props.size === 'lg') return 'py-4 wide:py-4';

  return props.size === 'sm' ? smallClasses(props) : undefined;
}

// A small row's subtitle keeps its line under the title, padded as any subtitled row; a switch fits its 36 too.
const smallClasses = ({ subtitle }: ResolvedItemProps): string =>
  cn('wide:min-h-9', !subtitle && 'wide:py-1.5');

// A loading row pads to Paper's 56, its spinner in a 20 slot; a pressable row shades on hover.
function stateClasses(props: ResolvedItemProps, sidebar: boolean): string {
  return cn(props.loading && 'py-4', props.onPress && pressClasses(sidebar));
}

const focusClasses =
  'web:focus-visible:outline-2 web:focus-visible:outline-focus web:focus-visible:-outline-offset-2';

// A sidebar row has no separators to hide and keeps its own hover tint (none when selected), so it only takes the focus ring.
const pressClasses = (sidebar: boolean): string =>
  sidebar ? focusClasses : cn(focusClasses, hoverClasses);

// The hover shade's own line is out of flow, or it would add a gap's width to the row.
const hoverClasses =
  'web:hover:bg-hover web:active:bg-pressed web:hover:after:absolute web:active:after:absolute web:hover:after:bg-inherit web:active:after:bg-inherit';

function sidebarClasses(props: ResolvedItemProps): string {
  return cn(
    'rounded-xl',
    // Hover is a lighter tint than selected; a selected row keeps its tint.
    props.selected
      ? 'bg-selected'
      : 'bg-transparent web:hover:bg-hover web:active:bg-pressed',
  );
}

export function rowEmphasis(
  props: ResolvedItemProps,
  sidebar: boolean,
): string {
  return props.tone === 'accent'
    ? 'text-accent'
    : plainEmphasis(props, sidebar);
}

function plainEmphasis(props: ResolvedItemProps, sidebar: boolean): string {
  return sidebar && !props.selected
    ? 'text-muted-foreground'
    : 'text-foreground';
}

/*
 * The last child's, outside a virtualised list, and the one above a hovered or pressed row, whose
 * shade would otherwise meet an inset line. Siblings hide it by CSS; a virtualised list's rows sit in
 * containers of their own, so the list tells the row instead.
 */
const hiddenSeparator = (place: RowPlace): string | undefined => {
  if (place.separatorHidden) return 'web:after:hidden';

  return place.endsSection === undefined
    ? cn('web:last:after:hidden', besideShadedRow)
    : undefined;
};

// A pressable row is a link, a button or a switch; a static row is a group, and draws no shade.
const besideShadedRow =
  'web:[&:has(+:is(a,[role=button],[role=switch]):hover)]:after:hidden web:[&:has(+:is(a,[role=button],[role=switch]):active)]:after:hidden';

/*
 * 1px on every web width: Chrome drops a 0.5px line on a phone-width page, even at 3x. A grouped
 * row's line runs from its text to the margin M in the border colour, as iOS's does; a card's
 * row keeps its fainter wide line.
 */
function separatorClasses(props: ResolvedItemProps, place: RowPlace): string {
  const grouped = props.variant !== 'card';

  return cn(
    'web:after:absolute web:after:bottom-0 web:after:right-4 web:after:left-4 web:after:h-px web:after:bg-border',
    grouped
      ? 'wide:web:after:right-5 wide:web:after:left-5'
      : 'wide:web:after:bg-border/40',
    hiddenSeparator(place),
    // A row with a leading slot insets its line to where its text starts.
    hasLeadingSlot(props) && rowLane(props, 'grouped').textInset,
  );
}

// An action row, such as "Add argument", acts in place, so it has no chevron.
export const hasDisclosure = (
  props: Pick<ResolvedItemProps, 'onPress' | 'tone' | 'disclosure'>,
): boolean => props.disclosure ?? (!!props.onPress && props.tone !== 'accent');

export function hasLeadingSlot(
  props: Pick<ResolvedItemProps, 'icon' | 'loading' | 'leading'>,
): boolean {
  return !!props.icon || !!props.loading || !!props.leading;
}

export function titleClasses(
  props: Pick<ResolvedItemProps, 'tone' | 'code'>,
): string {
  return cn('min-w-0 flex-1', props.code && 'type-code', toneClass(props.tone));
}
