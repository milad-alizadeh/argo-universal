import type * as React from 'react';
import type { ReferenceOption } from './rich-textarea-references';
import type {
  SuggestionResource,
  SuggestionSource,
} from './rich-textarea-suggestions';

export type {
  ComposerSuggestion,
  SuggestionAnswer,
  SuggestionResource,
  SuggestionSource,
} from './rich-textarea-suggestions';

export type { ReferenceOption } from './rich-textarea-references';

// What a parent can ask of the field, on every platform.
export interface RichTextareaHandle {
  // Focuses the field and puts the word at the caret, a space before it when the text there is not whitespace.
  insertWord: (word: string) => void;
}

// One API on every platform: the value is a markdown string (ADR-0023).
export interface RichTextareaProps {
  value: string;
  onChangeText: (value: string) => void;
  // Called when Return asks to send; ⇧Return adds a line. The phone drawing adds a line on Return.
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  accessibilityLabel: string;
  // The Issues and pull requests `#` offers; the web editor only, as the phone area has no tokens.
  references?: readonly ReferenceOption[];
  // The `/` menu's sources, in the order their results are listed.
  suggestions?: readonly SuggestionSource[];
  /*
   * The `resource_link`s of the chosen results whose text is still in the draft, told whenever the
   * list changes. The host sends them with the prompt beside the text, as an Issue reference's is.
   */
  onResourcesChange?: (resources: readonly SuggestionResource[]) => void;
  // Padding for the field itself, so a press anywhere in its padded area focuses the editor.
  fieldClassName?: string;
  // Focus the field when it mounts; the web editor only, as a phone keyboard should not open unasked.
  autoFocus?: boolean;
  ref?: React.Ref<RichTextareaHandle>;
}

/*
 * The text field's own look, shared by the web editor and the phone text area. The padding is spelt
 * out a side at a time rather than as `p-0`: a caller's `px-4` replaces `pl-0 pr-0`, while `p-0`
 * would outlive it and leave the text against the card's edge.
 */
export const plainFieldClassName =
  'min-h-5 border-0 rounded-none bg-transparent dark:bg-transparent pt-0 pr-0 pb-0 pl-0 type-control shadow-none';
