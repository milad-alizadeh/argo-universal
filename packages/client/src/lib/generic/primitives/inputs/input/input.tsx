import type { ReactElement } from 'react';
import { Platform, TextInput } from 'react-native';
import { cn } from '#lib/generic/utils';

type InputProps = React.ComponentProps<typeof TextInput> &
  React.RefAttributes<TextInput> & {
    // `muted` is the compact borderless field inside a popover, such as the link editor's.
    variant?: 'default' | 'muted';
  };
const variantClass = {
  default:
    'dark:bg-input/30 border-input bg-background h-10 border px-3 py-1 shadow-sm shadow-black/5 sm:h-9',
  muted:
    'h-8 sm:h-8 rounded-lg border-0 bg-muted dark:bg-muted px-2.5 py-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring',
};
const disabledInputClass = cn(
  'opacity-50',
  Platform.select({
    web: 'disabled:pointer-events-none disabled:cursor-not-allowed',
  }),
);
const platformInputClass = Platform.select({
  web: cn(
    'rounded-lg',
    'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground outline-none transition-[color,box-shadow]',
    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
  ),
  native: 'placeholder:text-muted-foreground/50',
});
function inputClassName({
  className,
  editable,
  variant = 'default',
}: InputProps): string {
  return cn(
    'text-foreground flex w-full min-w-0 flex-row items-center rounded-md type-body',
    editable === false && disabledInputClass,
    platformInputClass,
    variantClass[variant],
    className,
  );
}

function Input({
  className,
  variant,
  placeholderClassName: _placeholderClassName,
  ...props
}: InputProps): ReactElement {
  const { editable } = props;
  const look = inputClassName({ className, variant, editable });
  return <TextInput className={look} {...props} />;
}

export { Input };
