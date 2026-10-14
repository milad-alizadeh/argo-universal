import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { type EditorState, HISTORY_MERGE_TAG } from 'lexical';
import { useCallback, useEffect, useRef, useState } from 'react';
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

// A new value from outside (a sent or restored draft) replaces the text; drawing it is not an edit.
function useImportedValue(value: string, shown: ShownMarkdown): void {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (shown.changesTo(value))
      editor.update(() => $importMarkdown(value), { tag: HISTORY_MERGE_TAG });
  }, [editor, shown, value]);
}

// The newest onChangeText, read when an edit lands, so the handler need not change with it.
function useLatest<T>(current: T): { readonly current: T } {
  const latest = useRef(current);
  useEffect(() => {
    latest.current = current;
  }, [current]);

  return latest;
}

// An edit's markdown, sent when it differs. One identity for the field's life, so OnChangePlugin registers once.
function useSentEdits(
  shown: ShownMarkdown,
  onChangeText: (value: string) => void,
): (editorState: EditorState) => void {
  const latestOnChangeText = useLatest(onChangeText);

  return useCallback(
    (editorState: EditorState) => {
      const markdown = editorState.read($exportMarkdown);

      if (shown.changesTo(markdown)) latestOnChangeText.current(markdown);
    },
    [shown, latestOnChangeText],
  );
}

// Lexical owns the text while you type; returns the edit handler for OnChangePlugin, which skips caret moves.
export function useMarkdownValue(
  value: string,
  onChangeText: (value: string) => void,
): (editorState: EditorState) => void {
  const [shown] = useState(() => shownMarkdown(value));
  useImportedValue(value, shown);

  return useSentEdits(shown, onChangeText);
}
