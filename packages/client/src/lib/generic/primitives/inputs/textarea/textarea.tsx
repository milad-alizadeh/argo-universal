import type { ReactElement } from 'react';
import { Platform, TextInput } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import { cn } from '#lib/generic/utils';
import { usePrimitiveColor } from '../../native/primitive-color';

type TextareaProps = React.ComponentProps<typeof TextInput> &
  React.RefAttributes<TextInput>;

function textareaClassName({ className, editable }: TextareaProps): string {
  return cn(
    'text-foreground border-input dark:bg-input/30 flex min-h-16 w-full flex-row rounded-md border bg-transparent px-3 py-2 type-body shadow-sm shadow-black/5',
    'web:rounded-lg web:placeholder:text-muted-foreground web:focus-visible:border-ring web:focus-visible:ring-ring/50 web:aria-invalid:ring-destructive/20 web:dark:aria-invalid:ring-destructive/40 web:aria-invalid:border-destructive web:field-sizing-content web:resize-y web:outline-none web:transition-[color,box-shadow] web:focus-visible:ring-[3px] web:disabled:cursor-not-allowed',
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
  const colors = useTextareaColors();

  const placeholderClassName = cn(
    'text-muted-foreground',
    options.placeholderClassName,
  );

  return (
    <TextInput
      className={textareaClassName(options)}
      {...colors}
      placeholderClassName={placeholderClassName}
      {...textareaInputProps(options)}
    />
  );
}

function useTextareaColors(): Pick<
  TextareaProps,
  'cursorColor' | 'selectionColor'
> {
  const { colors } = useNativeTheme();
  const selection = usePrimitiveColor('bg-tint/20');

  return {
    cursorColor: colors.tint,
    selectionColor: Platform.OS === 'ios' ? colors.tint : selection,
  };
}

export { Textarea };
