import type { ReactElement } from 'react';
import { TextInput } from 'react-native';
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
    'h-8 sm:h-8 rounded-lg border-0 bg-muted dark:bg-muted px-2.5 py-0 shadow-none web:focus-visible:ring-1 web:focus-visible:ring-ring',
};

const disabledInputClass =
  'opacity-50 web:disabled:pointer-events-none web:disabled:cursor-not-allowed';

const platformInputClass = cn(
  'web:rounded-lg',
  'web:placeholder:text-muted-foreground web:selection:bg-primary web:selection:text-primary-foreground web:outline-none web:transition-[color,box-shadow]',
  'web:focus-visible:border-ring web:focus-visible:ring-ring/50 web:focus-visible:ring-[3px]',
  'web:aria-invalid:ring-destructive/20 web:dark:aria-invalid:ring-destructive/40 web:aria-invalid:border-destructive',
  'native:placeholder:text-muted-foreground/50',
);

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
