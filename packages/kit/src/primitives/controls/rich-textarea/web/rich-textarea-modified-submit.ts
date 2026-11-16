import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { COMMAND_PRIORITY_CRITICAL, KEY_ENTER_COMMAND } from 'lexical';
import { useEffect } from 'react';

function modifiedReturn(event: KeyboardEvent | null): event is KeyboardEvent {
  if (!event) return false;

  return [
    !event.isComposing,
    !event.shiftKey,
    !event.altKey,
    event.metaKey || event.ctrlKey,
  ].every(Boolean);
}

function submitModified(
  event: KeyboardEvent | null,
  submit: () => void,
): boolean {
  if (!modifiedReturn(event)) return false;
  event.preventDefault();
  submit();

  return true;
}

export function useModifiedSubmit(submit: (() => void) | undefined): void {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!submit) return;

    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => submitModified(event, submit),
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor, submit]);
}
