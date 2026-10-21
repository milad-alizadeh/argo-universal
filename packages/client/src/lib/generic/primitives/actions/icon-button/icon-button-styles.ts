import { cva } from 'class-variance-authority';
import { tintTransitionClassName } from '#lib/generic/motion';
import { cn } from '#lib/generic/utils';
import type { IconButtonProps } from './icon-button-props';

export const iconButtonClasses = cva(
  cn(
    tintTransitionClassName,
    'shrink-0 items-center justify-center rounded-md web:rounded-control border border-transparent web:outline-none web:focus-visible:outline-solid web:focus-visible:outline-2 web:focus-visible:outline-foreground web:focus-visible:outline-offset-3 min-h-11 min-w-11 web:sm:min-h-0 web:sm:min-w-0 android:min-h-12 android:min-w-12',
  ),
  {
    variants: {
      variant: {
        default:
          'bg-tint active:border-focus active:bg-pressed web:hover:bg-hover web:active:bg-pressed',
        ghost: 'bg-transparent active:bg-pressed web:hover:bg-hover',
        outline: 'border-border bg-card active:bg-pressed web:hover:bg-hover',
        // Reacts as the filled Button does, so both halves of a split button match.
        filled:
          'bg-primary active:bg-primary/77 web:hover:bg-primary/67 web:active:bg-primary/77',
      },
      disabled: { true: 'opacity-38' },
      // A toggle that is on, such as Bold in the format bar.
      pressed: { true: 'bg-selected' },
      // The web's corners: a control's radius, a header action's tighter 6, or a round button such as Send.
      corners: {
        control: '',
        tight: 'web:rounded-sm',
        round: 'rounded-full web:rounded-full',
      },
      size: {
        /*
         * One box at every width, and no touch minimum: a glyph in a dense row, such as the Composer's Attach and
         * Send, where a 44 box around a 16 glyph is most of the row's height. The target comes back through
         * `hitSlop`, so the button stays reachable while the row stays the size Paper draws (owner, 2026-10-21).
         */
        '2xs': 'size-7 min-h-0 min-w-0 android:min-h-0 android:min-w-0',
        xs: 'size-11 sm:size-7',
        sm: 'size-11 sm:size-8',
        md: 'size-11 sm:size-10',
        lg: 'size-11 sm:size-11',
        xl: 'size-12 sm:size-12',
      },
      // Pulls each edge in by half of (hit area - 16px control glyph): 44 on iOS and a narrow web window, 48 on Android.
      bleed: { true: '-m-3.5 android:-m-4' },
    },
    // A wide web window draws the smaller sizes; xl stays 48 everywhere.
    compoundVariants: [
      { bleed: true, size: 'xs', className: 'web:sm:-m-1.5' },
      { bleed: true, size: 'sm', className: 'web:sm:-m-2' },
      { bleed: true, size: 'md', className: 'web:sm:-m-3' },
      { bleed: true, size: 'xl', className: '-m-4' },
    ],
    defaultVariants: { size: 'sm', variant: 'default', corners: 'control' },
  },
);

// ActivityIndicator takes its colour from an `accent-*` class, so the spinner draws the glyph colour as one.
const iconSpinnerClasses = cva('accent-foreground', {
  variants: {
    variant: {
      default: '',
      ghost: '',
      outline: '',
      filled: 'accent-primary-foreground',
    },
    muted: { true: 'accent-muted-foreground' },
    danger: { true: 'accent-danger' },
  },
  defaultVariants: { variant: 'default' },
});

export function iconSpinnerClass(
  props: Pick<IconButtonProps, 'variant' | 'tone' | 'iconTone'>,
): string {
  return cn(
    iconSpinnerClasses({
      variant: props.variant,
      muted: props.iconTone === 'muted',
      danger: props.tone === 'danger',
    }),
  );
}

const iconToneTextClasses = cva('', {
  variants: {
    muted: { true: 'text-muted-foreground' },
    danger: { true: 'text-danger' },
  },
});

export function iconToneTextClass(
  props: Pick<IconButtonProps, 'tone' | 'iconTone'>,
): string {
  return iconToneTextClasses({
    muted: props.iconTone === 'muted',
    danger: props.tone === 'danger',
  });
}
