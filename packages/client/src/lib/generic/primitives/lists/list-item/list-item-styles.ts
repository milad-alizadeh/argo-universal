import { cn } from '../../../utils';
import type { ListItemProps } from '../../fields/field-props';

// endsSection: a virtualised list says whether the row ends its section; elsewhere the last child does.
export function rowClasses(
  props: ListItemProps,
  navigation: boolean,
  endsSection?: boolean,
): string {
  return cn(
    'relative min-h-[52px] flex-row items-center gap-3 px-4 py-3 bg-muted wide:min-h-11 web:select-none web:[&_*]:select-none',
    controlClasses(props),
    sizeClasses(props),
    stateClasses(props),
    showsSeparator(navigation, endsSection) &&
      separatorClasses(props, endsSection),
    navigation && sidebarClasses(props),
  );
}

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
function stateClasses(props: ListItemProps): string {
  return cn(
    props.loading && 'py-4',
    props.onPress &&
      'web:hover:bg-[var(--color-separator)] web:active:bg-[var(--color-separator)] web:focus-visible:outline-2 web:focus-visible:outline-ring web:focus-visible:-outline-offset-2 web:before:absolute web:before:-top-px web:before:inset-x-0 web:before:h-px web:before:bg-inherit web:before:hidden web:hover:before:block web:active:before:block web:hover:after:bg-inherit web:active:after:bg-inherit',
  );
}

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

// A sidebar row has none, and neither has the row that ends its section.
const showsSeparator = (
  navigation: boolean,
  endsSection: boolean | undefined,
): boolean => !navigation && endsSection !== true;

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
