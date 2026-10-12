import type { TextInputProps } from 'react-native';

// One API on every platform: the value is a markdown string (ADR-0023).
export interface RichTextareaProps {
  value: string;
  onChangeText: (value: string) => void;
  // Called when the field asks to send; today's plain field adds a line on Return instead.
  onSubmit?: () => void;
  placeholder?: string;
  editable?: boolean;
  accessibilityLabel: string;
}

// Today's plain field, shared by the web and phone drawings until the web one draws the editor.
export const plainFieldClassName =
  'min-h-5 border-0 rounded-none bg-transparent dark:bg-transparent p-0 type-control shadow-none';

export function plainFieldProps({
  onSubmit: _onSubmit,
  editable = true,
  ...field
}: RichTextareaProps): TextInputProps {
  return {
    ...field,
    editable,
    placeholderTextColorClassName: 'accent-muted-foreground/70',
  };
}
