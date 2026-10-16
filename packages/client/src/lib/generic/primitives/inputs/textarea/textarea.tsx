import type { ReactElement } from 'react';
import { Platform, TextInput } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import { cn } from '#lib/generic/utils';
import { usePrimitiveColor } from '#primitives/native/primitive-color';
import type { TextareaProps } from './textarea-props';

function textareaClassName({ className, disabled }: TextareaProps): string {
  return cn(
    'text-foreground border-border dark:bg-border/30 flex min-h-16 w-full flex-row rounded-md border bg-transparent px-3 py-2 type-body shadow-control',
    'web:rounded-control web:placeholder:text-muted-foreground web:focus-visible:border-focus web:focus-visible:ring-focus/50 web:aria-invalid:ring-danger/20 web:dark:aria-invalid:ring-danger/40 web:aria-invalid:border-danger web:field-sizing-content web:resize-y web:outline-none web:transition-[color,box-shadow] web:focus-visible:ring-[3px] web:disabled:cursor-not-allowed',
    disabled === true && 'opacity-50',
    className,
  );
}

function textareaInputProps({
  className: _className,
  multiline = true,
  numberOfLines = Platform.select({ web: 2, native: 8 }),
  disabled,
  ...props
}: TextareaProps): React.ComponentProps<typeof TextInput> {
  const lines = { multiline, numberOfLines, textAlignVertical: 'top' } as const;

  return { ...lines, editable: editableWhen(disabled), ...props };
}

function editableWhen(disabled: boolean | undefined): boolean | undefined {
  return disabled === undefined ? undefined : !disabled;
}

function Textarea(options: TextareaProps): ReactElement {
  const colors = useTextareaColors();

  return (
    <TextInput
      className={textareaClassName(options)}
      {...colors}
      {...textareaInputProps(options)}
    />
  );
}

function useTextareaColors(): Pick<
  TextareaProps,
  'cursorColor' | 'selectionColor'
> {
  const { colors } = useNativeTheme();
  const selection = usePrimitiveColor('bg-accent/20');

  return {
    cursorColor: colors.accent,
    selectionColor: Platform.OS === 'ios' ? colors.accent : selection,
  };
}

export { Textarea };
