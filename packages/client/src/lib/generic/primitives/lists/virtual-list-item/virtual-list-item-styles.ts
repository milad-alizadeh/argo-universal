import { Platform } from 'react-native';
import { tintTransitionClassName } from '#lib/generic/motion';
import { cn } from '../../../utils';
import type { VirtualListPosition } from './virtual-list-item-props';

/*
 * A phone row is a piece of its section's grouped card, which it clips to: iOS's rows share one plate,
 * square inside it; Material's are tiles 2 apart, 4 round inside.
 */
const sectionCorners = {
  only: 'rounded-grouped',
  first: 'rounded-t-grouped android:mb-0.5',
  middle: 'android:mb-0.5',
  last: 'rounded-b-grouped',
} as const satisfies Record<VirtualListPosition, string>;

// Wide, a bare row that hover tints and selection uses the shared flat fill.
export function surfaceClasses(
  position: VirtualListPosition,
  selected: boolean,
): string {
  return cn(
    'overflow-hidden rounded-grouped-inner bg-card',
    sectionCorners[position],
    'wide:rounded-xl wide:bg-transparent',
    selected && 'wide:bg-selected',
  );
}

// Android's Pressable draws the ripple; elsewhere the row takes the pressed tint.
const pressedTint = Platform.OS === 'android' ? undefined : 'active:bg-pressed';

// The stock rows' heights and gaps: iOS 44, Material 56; wide, 32.
const rowGeometryClasses =
  'min-h-11 flex-row items-center gap-3 px-4 py-2.75 android:min-h-14 android:gap-4 android:py-2 wide:min-h-8 wide:gap-3 wide:py-0 wide:pl-4 wide:pr-3';

export const rowClasses = cn(
  rowGeometryClasses,
  'web:hover:bg-hover web:select-none',
  tintTransitionClassName,
  pressedTint,
);

const separated = {
  only: false,
  first: true,
  middle: true,
  last: false,
} as const satisfies Record<VirtualListPosition, boolean>;

// iOS's inset line under every row but a section's last, from the title to the trailing gutter.
export function separatorClasses(
  position: VirtualListPosition,
  leading: boolean,
): string | undefined {
  if (!separated[position]) return undefined;

  return cn(
    'absolute bottom-0 left-4 right-4 bg-border android:hidden wide:hidden',
    // The 16 gutter, the 24 leading slot and the 12 gap.
    leading && 'left-13',
  );
}

export const leadingClasses =
  'relative size-6 shrink-0 items-center justify-center wide-type:size-5';

// iOS lets the trailing content run past 48; Material keeps it to 48; wide keeps 40.
export const trailingClasses =
  'min-w-12 shrink-0 flex-row items-center justify-end gap-1 android:w-12 wide:w-10 wide:min-w-10';
