import type { ReactElement } from 'react';
import { Platform, TextInput } from 'react-native';
import { cn } from '#lib/utils';

type TextareaProps = React.ComponentProps<typeof TextInput> &
  React.RefAttributes<TextInput>;

function textareaClassName({ className, editable }: TextareaProps): string {
  return cn(
    'text-foreground border-input dark:bg-input/30 flex min-h-16 w-full flex-row rounded-md border bg-transparent px-3 py-2 text-base shadow-sm shadow-black/5 md:text-sm',
    Platform.select({
      web: 'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive field-sizing-content resize-y outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed',
    }),
    editable === false && 'opacity-50',
    className,
  );
}

function textareaInputProps({
  className: _className,
  placeholderClassName: _placeholderClassName,
  multiline = true,
  numberOfLines = Platform.select({ web: 2, native: 8 }),
  ...props
}: TextareaProps): TextareaProps {
  return { multiline, numberOfLines, textAlignVertical: 'top', ...props };
}

function Textarea(options: TextareaProps): ReactElement {
  const classes = textareaClassName(options);
  const placeholderClassName = cn(
    'text-muted-foreground',
    options.placeholderClassName,
  );
  return (
    <TextInput
      className={classes}
      placeholderClassName={placeholderClassName}
      {...textareaInputProps(options)}
    />
  );
}

export { Textarea };
