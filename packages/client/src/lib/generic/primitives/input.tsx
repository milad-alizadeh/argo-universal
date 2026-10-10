import type { ReactElement } from 'react';
import { Platform, TextInput } from 'react-native';
import { cn } from '#lib/generic/utils';

type InputProps = React.ComponentProps<typeof TextInput> &
  React.RefAttributes<TextInput>;
const disabledInputClass = cn(
  'opacity-50',
  Platform.select({
    web: 'disabled:pointer-events-none disabled:cursor-not-allowed',
  }),
);
const platformInputClass = Platform.select({
  web: cn(
    'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground outline-none transition-[color,box-shadow] md:text-sm',
    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
  ),
  native: 'placeholder:text-muted-foreground/50',
});
function inputClassName({ className, editable }: InputProps): string {
  return cn(
    'dark:bg-input/30 border-input bg-background text-foreground flex h-10 w-full min-w-0 flex-row items-center rounded-md border px-3 py-1 text-base leading-5 shadow-sm shadow-black/5 sm:h-9',
    editable === false && disabledInputClass,
    platformInputClass,
    className,
  );
}

function Input({
  className,
  placeholderClassName: _placeholderClassName,
  ...props
}: React.ComponentProps<typeof TextInput> &
  React.RefAttributes<TextInput>): ReactElement {
  return (
    <TextInput
      className={inputClassName({ className, editable: props.editable })}
      {...props}
    />
  );
}

export { Input };
