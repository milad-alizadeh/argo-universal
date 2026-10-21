import { cva } from 'class-variance-authority';
import { cn } from '#kit/utils';
import type { ButtonProps, DrawnButtonProps } from './button-props';

const buttonClasses = cva(
  'group shrink-0 flex-row items-center justify-center gap-2 rounded-md shadow-none web:whitespace-nowrap web:outline-none web:transition-all web:focus-visible:border-focus web:focus-visible:ring-3 web:focus-visible:ring-focus/50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary web:shadow-control active:bg-primary/77 web:hover:bg-primary/67 web:active:bg-primary/77',
        outline:
          'border border-border bg-card active:bg-pressed web:hover:bg-hover dark:bg-border/30 dark:active:bg-pressed web:dark:hover:bg-hover',
        secondary:
          'border border-border bg-card active:bg-pressed web:hover:bg-hover dark:bg-border/30 dark:active:bg-pressed web:dark:hover:bg-hover',
        ghost:
          'active:bg-pressed dark:active:bg-pressed web:hover:bg-hover web:dark:hover:bg-hover',
        link: '',
      },
      size: {
        xs: 'min-h-11 px-1.5 py-2 gap-1.5 web:sm:min-h-7 web:sm:h-7 web:sm:py-0',
        sm: 'min-h-11 px-3 py-2 gap-1.5 web:sm:min-h-8 web:sm:h-8 web:sm:py-0',
        md: 'min-h-11 px-4 py-2 web:sm:min-h-10',
        lg: 'min-h-11 px-6 py-2',
      },
      fullWidth: { true: 'w-full' },
      disabled: { true: 'opacity-50' },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

/*
 * On a phone an Argo-drawn button draws what the system button of its variant draws: a capsule at SwiftUI's
 * large control size on iOS, Material 3's height and padding on Android, and the whole button faded when disabled.
 */
const filledNative =
  'ios:min-h-12.5 ios:px-5 ios:border-0 ios:bg-muted android:min-h-10 android:px-6';

const textNative = 'android:min-h-10 android:px-3';

const nativeClasses = cva('ios:rounded-full android:rounded-full', {
  variants: {
    variant: {
      default: `${filledNative} ios:bg-primary`,
      outline: `${filledNative} android:bg-transparent android:border-muted-foreground`,
      secondary: `${filledNative} android:border-0 android:bg-muted`,
      ghost: textNative,
      link: textNative,
    },
    disabled: { true: 'ios:opacity-38 android:opacity-38' },
  },
  defaultVariants: { variant: 'default' },
});

// iOS labels its buttons at the size of its header text buttons, in medium weight.
const nativeLabelClass = 'ios:text-nav-action ios:font-medium';

const textClasses = cva(
  'type-control web:pointer-events-none web:transition-colors',
  {
    variants: {
      variant: {
        default: 'text-primary-foreground',
        outline:
          'text-foreground group-active:text-foreground web:group-hover:text-foreground',
        secondary:
          'text-foreground group-active:text-foreground web:group-hover:text-foreground',
        ghost: 'text-foreground group-active:text-foreground ios:font-normal',
        link: 'text-primary web:underline-offset-4 group-active:underline web:group-hover:underline ios:font-normal',
      },
      destructive: { true: 'text-danger' },
    },
    defaultVariants: { variant: 'default' },
  },
);

const foregroundAccent = 'accent-foreground';

const spinnerClasses = cva('', {
  variants: {
    variant: {
      default: 'accent-primary-foreground',
      outline: foregroundAccent,
      secondary: foregroundAccent,
      ghost: foregroundAccent,
      link: 'accent-primary',
    },
    destructive: { true: 'accent-danger' },
  },
  defaultVariants: { variant: 'default' },
});

type ButtonClassProps = Pick<
  DrawnButtonProps,
  'variant' | 'size' | 'tone' | 'disabled' | 'fullWidth' | 'className'
>;

export function contentButtonClass(props: ButtonClassProps): string {
  const { className, fullWidth, ...variants } = props;

  return cn(
    buttonClasses({ ...variants, fullWidth: fullWidth === true }),
    nativeClasses({ variant: props.variant, disabled: props.disabled }),
    props.tone === 'danger' && destructiveClass,
    className,
  );
}

// A destructive button is transparent whatever its variant: a red label, no fill, no border, a faint red tint on press or hover.
const destructiveClass =
  'border-0 bg-transparent web:shadow-none active:bg-danger/10 web:hover:bg-danger/10';

export function contentTextClass(
  props: Pick<ButtonProps, 'tone' | 'variant'>,
): string {
  const destructive = props.tone === 'danger';

  return cn(
    textClasses({ variant: props.variant, destructive }),
    nativeLabelClass,
  );
}

// The label colour as an accent token, for the loading spinner.
export function contentSpinnerClass(
  props: Pick<ButtonProps, 'tone' | 'variant'>,
): string {
  return spinnerClasses({
    variant: props.variant,
    destructive: props.tone === 'danger',
  });
}

// A Pressable that stands beside a phone Button takes `native` so the two draw the same system button.
export function contentActionClass(
  props: Pick<ButtonClassProps, 'variant' | 'className' | 'disabled'> & {
    native?: boolean;
  },
): string {
  const { className, native, ...variants } = props;

  return cn(
    buttonClasses(variants),
    'min-h-0 android:min-h-0 web:sm:min-h-0',
    native && nativeClasses(variants),
    className,
  );
}
