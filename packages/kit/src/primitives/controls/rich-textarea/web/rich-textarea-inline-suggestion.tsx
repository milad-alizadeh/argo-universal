import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  COMMAND_PRIORITY_HIGH,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalEditor,
} from 'lexical';
import { useEffect } from 'react';
import type { RichTextareaProps } from '../rich-textarea-props';

type Suggestion = NonNullable<RichTextareaProps['inlineSuggestion']>;

function modified(event: KeyboardEvent): boolean {
  return [event.shiftKey, event.altKey, event.ctrlKey, event.metaKey].some(
    Boolean,
  );
}

function unavailable(editor: LexicalEditor): boolean {
  return (
    editor.isComposing() ||
    !editor.isEditable() ||
    $getRoot().getTextContentSize() > 0
  );
}

function acceptHandler(
  editor: LexicalEditor,
  suggestion: Suggestion,
): (event: KeyboardEvent) => boolean {
  return (event): boolean => {
    if (modified(event) || unavailable(editor)) return false;

    event.preventDefault();
    suggestion.onAccept();

    return true;
  };
}

function dismissHandler(
  editor: LexicalEditor,
  suggestion: Suggestion,
): (event: KeyboardEvent) => boolean {
  return (event): boolean => {
    if (unavailable(editor)) return false;

    event.preventDefault();
    suggestion.onDismiss();

    return true;
  };
}

function registerSuggestion(
  editor: LexicalEditor,
  suggestion: Suggestion | undefined,
): (() => void) | undefined {
  if (!suggestion) return undefined;

  const accept = registerAccept(editor, suggestion);
  const dismiss = registerDismiss(editor, suggestion);

  return (): void => {
    accept();
    dismiss();
  };
}

function registerAccept(
  editor: LexicalEditor,
  suggestion: Suggestion,
): () => void {
  return editor.registerCommand(
    KEY_TAB_COMMAND,
    acceptHandler(editor, suggestion),
    COMMAND_PRIORITY_HIGH,
  );
}

function registerDismiss(
  editor: LexicalEditor,
  suggestion: Suggestion,
): () => void {
  return editor.registerCommand(
    KEY_ESCAPE_COMMAND,
    dismissHandler(editor, suggestion),
    COMMAND_PRIORITY_HIGH,
  );
}

export function InlineSuggestionPlugin({
  inlineSuggestion,
}: Pick<RichTextareaProps, 'inlineSuggestion'>): null {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () => registerSuggestion(editor, inlineSuggestion),
    [editor, inlineSuggestion],
  );

  return null;
}
