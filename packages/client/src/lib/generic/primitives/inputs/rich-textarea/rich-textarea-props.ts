import type { ReferenceOption } from './rich-textarea-references';

export type { ReferenceOption } from './rich-textarea-references';

// One API on every platform: the value is a markdown string (ADR-0023).
export interface RichTextareaProps {
  value: string;
  onChangeText: (value: string) => void;
  // Called when Return asks to send; ⇧Return adds a line. The phone drawing adds a line on Return.
  onSubmit?: () => void;
  placeholder?: string;
  editable?: boolean;
  accessibilityLabel: string;
  // The Issues and pull requests `#` offers; the web editor only, as the phone area has no tokens.
  references?: readonly ReferenceOption[];
}

// The text field's own look, shared by the web editor and the phone text area.
export const plainFieldClassName =
  'min-h-5 border-0 rounded-none bg-transparent dark:bg-transparent p-0 type-control shadow-none';
