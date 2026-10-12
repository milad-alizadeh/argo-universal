import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HISTORY_MERGE_TAG, type UpdateListener } from 'lexical';
import { useEffect, useState } from 'react';
import { $exportMarkdown, $importMarkdown } from './rich-textarea-markdown';

// The markdown the field last showed, so only a different value is imported or sent.
interface ShownMarkdown {
  changesTo: (markdown: string) => boolean;
}

function shownMarkdown(initial: string): ShownMarkdown {
  let shown = initial;
  return {
    changesTo: (markdown) => {
      if (markdown === shown) return false;
      shown = markdown;
      return true;
    },
  };
}

function sendChanges(
  shown: ShownMarkdown,
  onChangeText: (value: string) => void,
): UpdateListener {
  return ({ editorState, tags }) => {
    if (tags.has(HISTORY_MERGE_TAG)) return;
    const markdown = editorState.read($exportMarkdown);
    if (shown.changesTo(markdown)) onChangeText(markdown);
  };
}

// Lexical owns the text while you type; a new value from outside (a sent or restored draft) replaces it.
export function useMarkdownValue(
  value: string,
  onChangeText: (value: string) => void,
): void {
  const [editor] = useLexicalComposerContext();
  const [shown] = useState(() => shownMarkdown(value));
  useEffect(() => {
    if (shown.changesTo(value))
      editor.update(() => $importMarkdown(value), { tag: HISTORY_MERGE_TAG });
  }, [editor, shown, value]);
  useEffect(
    () => editor.registerUpdateListener(sendChanges(shown, onChangeText)),
    [editor, shown, onChangeText],
  );
}
