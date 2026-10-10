import { cva } from 'class-variance-authority';
import { cn } from '#lib/generic/utils';
import type { ButtonProps } from './button-props';

const buttonClasses = cva(
  'group shrink-0 flex-row items-center justify-center gap-2 rounded-md shadow-none web:whitespace-nowrap web:outline-none web:transition-all web:focus-visible:border-ring web:focus-visible:ring-[3px] web:focus-visible:ring-ring/50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary web:shadow-xs active:bg-primary/77 web:hover:bg-primary/67 web:active:bg-primary/77',
        outline:
          'border border-border bg-background active:bg-accent web:hover:bg-accent dark:border-input dark:bg-input/30 dark:active:bg-input/50 web:dark:hover:bg-input/50',
        secondary:
          'border border-border bg-background active:bg-accent web:hover:bg-accent dark:border-input dark:bg-input/30 dark:active:bg-input/50 web:dark:hover:bg-input/50',
        ghost:
          'active:bg-accent dark:active:bg-accent/50 web:hover:bg-accent web:dark:hover:bg-accent/50',
        link: '',
      },
      size: {
        sm: 'min-h-11 px-3 py-2 gap-1.5 web:sm:min-h-8',
        md: 'min-h-11 px-4 py-2 web:sm:min-h-10',
        lg: 'min-h-11 px-6 py-2',
      },
      fullWidth: { true: 'w-full' },
      disabled: { true: 'opacity-50' },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

const textClasses = cva(
  'text-sm font-medium web:pointer-events-none web:transition-colors',
  {
    variants: {
      variant: {
        default: 'text-primary-foreground',
        outline:
          'text-foreground group-active:text-accent-foreground web:group-hover:text-accent-foreground',
        secondary:
          'text-foreground group-active:text-accent-foreground web:group-hover:text-accent-foreground',
        ghost: 'text-foreground group-active:text-accent-foreground',
        link: 'text-primary web:underline-offset-4 group-active:underline web:group-hover:underline',
      },
      destructive: { true: 'text-destructive' },
    },
    defaultVariants: { variant: 'default' },
  },
);

type ButtonClassProps = Pick<
  ButtonProps,
  'variant' | 'size' | 'role' | 'disabled' | 'fullWidth' | 'className'
>;

export function contentButtonClass(props: ButtonClassProps): string {
  const { className, ...variants } = props;
  return cn(
    buttonClasses(variants),
    'android:min-h-12',
    destructiveButtonClass(props),
    className,
  );
}

const destructiveOutline =
  'border border-destructive bg-transparent web:shadow-none active:bg-destructive/10 web:hover:bg-destructive/10';
const destructiveText =
  'bg-transparent active:bg-destructive/10 web:hover:bg-destructive/10';
const destructiveClasses = {
  default:
    'bg-destructive active:bg-destructive/90 web:hover:bg-destructive/90',
  outline: destructiveOutline,
  secondary: destructiveOutline,
  ghost: destructiveText,
  link: destructiveText,
};

function destructiveButtonClass(
  props: Pick<ButtonProps, 'role' | 'variant'>,
): string | undefined {
  if (props.role !== 'destructive') return undefined;
  return destructiveClasses[props.variant ?? 'outline'];
}

export function contentTextClass(
  props: Pick<ButtonProps, 'role' | 'variant'>,
): string {
  const filledDestructive =
    props.role === 'destructive' && isFilledVariant(props.variant);
  return cn(
    textClasses({
      variant: props.variant,
      destructive: props.role === 'destructive',
    }),
    filledDestructive && 'text-destructive-foreground',
  );
}

export function contentActionClass(
  props: Pick<ButtonClassProps, 'variant' | 'className' | 'disabled'>,
): string {
  const { className, ...variants } = props;
  return cn(buttonClasses(variants), 'min-h-0 android:min-h-0', className);
}

function isFilledVariant(variant: ButtonProps['variant']): boolean {
  return variant === 'default';
}
