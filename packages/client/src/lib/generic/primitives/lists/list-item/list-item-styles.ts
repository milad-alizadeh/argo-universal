import { cn } from '../../../utils';
import type { ListItemProps } from '../../fields/field-props';

interface Corners {
  first: boolean;
  last: boolean;
}

// A virtualised list says whether the row ends its section, and a card's row where it sits in its card; elsewhere the last child ends it.
export interface RowPlace {
  endsSection?: boolean;
  corners?: Corners;
  // The row below is hovered, which draws its own shade over the line between them.
  separatorHidden?: boolean;
}

export function rowClasses(
  props: ListItemProps,
  navigation: boolean,
  place: RowPlace = {},
): string {
  return cn(
    'relative min-h-[52px] flex-row items-center gap-3 px-4 py-3 bg-muted wide:min-h-11 web:select-none web:[&_*]:select-none',
    controlClasses(props),
    sizeClasses(props),
    stateClasses(props, navigation),
    cornerClasses(place.corners),
    edgeClasses(props, navigation, place),
  );
}

// A sidebar row has no separator, and neither has the row that ends its section.
function edgeClasses(
  props: ListItemProps,
  navigation: boolean,
  place: RowPlace,
): string | undefined {
  if (navigation) return sidebarClasses(props);

  return place.endsSection === true
    ? undefined
    : separatorClasses(props, place);
}

// A card's rows round their own corners.
const cornerClasses = (corners: Corners | undefined): string =>
  cn(topCorners(corners), bottomCorners(corners));

const topCorners = (corners: Corners | undefined): string | undefined =>
  corners?.first ? 'rounded-t-2xl' : undefined;

const bottomCorners = (corners: Corners | undefined): string | undefined =>
  corners?.last ? 'rounded-b-2xl' : undefined;

function controlClasses(
  props: Pick<ListItemProps, 'subtitle' | 'detail'>,
): string {
  return cn(
    props.subtitle && 'wide:min-h-12.5 wide:py-1.5',
    props.detail && 'px-0 py-0 wide:py-0',
  );
}

// A large row pads 16 all round at every width.
const sizeClasses = ({ size }: ListItemProps): string | undefined =>
  size === 'large' ? 'py-4 wide:py-4' : undefined;

// A wide window draws its rows' parts 8 apart, but a sidebar's and a large row's keep 12.
export const contentGap = (
  sidebar: boolean,
  size: ListItemProps['size'],
): string | undefined =>
  sidebar || size === 'large' ? undefined : 'wide:gap-2';

// A loading row pads to Paper's 56, its spinner in a 20 slot; a pressable row shades on hover.
function stateClasses(props: ListItemProps, navigation: boolean): string {
  return cn(props.loading && 'py-4', props.onPress && pressClasses(navigation));
}

const focusClasses =
  'web:focus-visible:outline-2 web:focus-visible:outline-ring web:focus-visible:-outline-offset-2';

// A sidebar row has no separators to hide and keeps its own hover tint (none when selected), so it only takes the focus ring.
const pressClasses = (navigation: boolean): string =>
  navigation ? focusClasses : cn(focusClasses, hoverClasses);

// The hover shade's own line is out of flow, or it would add a gap's width to the row.
const hoverClasses =
  'web:hover:bg-[var(--color-separator)] web:active:bg-[var(--color-separator)] web:hover:after:absolute web:active:after:absolute web:hover:after:bg-inherit web:active:after:bg-inherit';

function sidebarClasses(props: ListItemProps): string {
  return cn(
    'rounded-selection',
    // Hover is a lighter tint than selected; a selected row keeps its tint.
    props.selected
      ? 'bg-selected'
      : 'bg-transparent web:hover:bg-selected/50 web:active:bg-selected',
  );
}

export function rowEmphasis(props: ListItemProps, navigation: boolean): string {
  return props.tone === 'accent'
    ? 'text-tint'
    : plainEmphasis(props, navigation);
}

function plainEmphasis(props: ListItemProps, navigation: boolean): string {
  return navigation && !props.selected
    ? 'text-muted-foreground'
    : 'text-foreground';
}

// The last child's, outside a virtualised list, and the one above a hovered row.
const hiddenSeparator = (place: RowPlace): string | undefined => {
  if (place.separatorHidden) return 'web:after:hidden';

  return place.endsSection === undefined ? 'web:last:after:hidden' : undefined;
};

// 1px on every web width: Chrome drops a 0.5px line on a phone-width page, even at 3x.
function separatorClasses(props: ListItemProps, place: RowPlace): string {
  return cn(
    'web:after:absolute web:after:bottom-0 web:after:right-4 web:after:left-4 web:after:h-px web:after:bg-[var(--color-separator)]',
    hiddenSeparator(place),
    // Inset to the text: the 16 gutter, the icon slot (24 phone, 20 wide) and the 12 gap.
    hasLeadingSlot(props) && 'web:after:left-13 wide:web:after:left-12',
  );
}

// An action row, such as "Add argument", acts in place, so it has no chevron.
export const hasDisclosure = (
  props: Pick<ListItemProps, 'onPress' | 'tone' | 'disclosure'>,
): boolean => props.disclosure ?? (!!props.onPress && props.tone !== 'accent');

export function hasLeadingSlot(
  props: Pick<ListItemProps, 'icon' | 'loading' | 'leading'>,
): boolean {
  return !!props.icon || !!props.loading || !!props.leading;
}

export function titleClasses(
  props: Pick<ListItemProps, 'tone' | 'code'>,
): string {
  return cn(
    'min-w-0 flex-1',
    props.code && 'type-code',
    props.tone && toneText[props.tone],
  );
}

const toneText = {
  destructive: 'text-destructive',
  accent: 'text-tint',
  muted: 'text-muted-foreground',
};
