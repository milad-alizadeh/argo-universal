import { cn } from '#kit/utils';
import type { PillProps } from './pill-props';

/*
 * Minimums, not heights. Kit text scales with Dynamic Type (ADR-0032), so a Pill's box grows with the words in
 * it; pinned, the box kept its size and cut the letters off at its bottom edge at the larger sizes (#1529).
 */
const sizes = {
  label: 'min-h-5 gap-1 px-2',
  control: 'min-h-7 gap-1.5 px-2.5',
} as const;

export const pillGeometry = (variant: 'label' | 'control'): string =>
  cn('min-w-0 flex-row items-center rounded-full', sizes[variant]);

/*
 * The touch target is wider and taller than the pill it holds, so the pill is centred inside it; icon-only, that
 * centring is the whole point, since the target grows to 44pt around a 28pt circle. A column lays its children out
 * full width, though, and a stretched target centred a stacked pill in the page rather than leaving it on the
 * content inset (#1662), so a pill carrying words hugs the leading edge of whatever target it is given.
 */
export const pillTouchClass = ({
  iconOnly,
  fill,
}: Pick<PillProps, 'iconOnly' | 'fill'>): string =>
  cn(
    'group min-w-0 shrink min-h-7 native:min-h-11 android:min-h-12 native:min-w-11 android:min-w-12 justify-center web:outline-none',
    iconOnly ? 'items-center' : 'items-start',
    fill && 'w-full',
  );

export const pillContentClass = ({
  iconOnly,
  fill,
}: Pick<PillProps, 'iconOnly' | 'fill'>): string =>
  cn(
    pillGeometry('control'),
    'max-w-full shrink border border-transparent',
    iconOnly && 'w-7 px-0 justify-center',
    fill && 'w-full',
  );
