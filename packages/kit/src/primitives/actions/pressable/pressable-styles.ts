import { buttonDefaults } from '@repo/contracts/kit-tokens';
import { cva } from 'class-variance-authority';
import { cn } from '#kit/utils';
import type { KitProps } from '../../kit-props';

const actionClasses = cva(
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
      disabled: { true: 'opacity-50' },
    },
    defaultVariants: buttonDefaults,
  },
);

/*
 * On a phone a `native` action draws what the system button of its variant draws: a capsule at SwiftUI's
 * large control size on iOS, Material 3's height and padding on Android, and the whole action faded when disabled.
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
  defaultVariants: { variant: buttonDefaults.variant },
});

type ActionClassProps = Pick<KitProps<'Button'>, 'variant' | 'disabled'> & {
  className?: string;
  native?: boolean;
};

// A button-like Pressable, such as a chip or a menu trigger; `native` makes one beside a phone Button draw the same system button.
export function contentActionClass(props: ActionClassProps): string {
  const { className, native, ...variants } = props;

  return cn(
    actionClasses(variants),
    'min-h-0 android:min-h-0 web:sm:min-h-0',
    native && nativeClasses(variants),
    className,
  );
}
