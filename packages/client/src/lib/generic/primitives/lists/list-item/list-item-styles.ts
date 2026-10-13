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
    stateClasses(props, navigation, place),
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
    : separatorClasses(props, place.endsSection);
}

// A card's rows round their own corners: a wrapper's clip would also hide the line that covers the separator above on hover.
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
function stateClasses(
  props: ListItemProps,
  navigation: boolean,
  place: RowPlace,
): string {
  return cn(
    props.loading && 'py-4',
    props.onPress && pressClasses(navigation, place),
  );
}

const focusClasses =
  'web:focus-visible:outline-2 web:focus-visible:outline-ring web:focus-visible:-outline-offset-2';

// A sidebar row has no separators to hide and keeps its own hover tint (none when selected), so it only takes the focus ring.
const pressClasses = (navigation: boolean, place: RowPlace): string =>
  navigation
    ? focusClasses
    : cn(focusClasses, hoverClasses, separatorAbove(place));

const separatorAbove = (place: RowPlace): string | undefined =>
  place.corners?.first ? undefined : hoverSeparatorAbove;

const hoverClasses =
  'web:hover:bg-[var(--color-separator)] web:active:bg-[var(--color-separator)] web:hover:after:bg-inherit web:active:after:bg-inherit';

// The line over the separator above; a card's first row has none, as it would stick out of the card.
const hoverSeparatorAbove =
  'web:before:absolute web:before:-top-px web:before:inset-x-0 web:before:h-px web:before:bg-inherit web:before:hidden web:hover:before:block web:active:before:block';

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

// 1px on every web width: Chrome drops a 0.5px line on a phone-width page, even at 3x.
function separatorClasses(
  props: ListItemProps,
  endsSection: boolean | undefined,
): string {
  return cn(
    'web:after:absolute web:after:bottom-0 web:after:right-4 web:after:left-4 web:after:h-px web:after:bg-[var(--color-separator)]',
    endsSection === undefined && 'web:last:after:hidden',
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
