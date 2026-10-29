import { cn } from '#kit/utils';
import type { PillProps } from './pill-props';

const sizes = {
  label: 'h-5 gap-1 px-2',
  control: 'h-7 gap-1.5 px-2.5',
} as const;

export const pillGeometry = (variant: 'label' | 'control'): string =>
  cn('min-w-0 flex-row items-center rounded-full', sizes[variant]);

export const pillTouchClass = ({ fill }: Pick<PillProps, 'fill'>): string =>
  cn(
    'group min-w-0 shrink h-7 native:h-11 android:h-12 native:min-w-11 android:min-w-12 items-center justify-center web:outline-none',
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
