import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import type * as React from 'react';
import { useEffect } from 'react';
import { richTextareaTransformers } from './rich-textarea-markdown';
import { registerMarkdownOnly } from './rich-textarea-paste';
import { registerListTab } from './rich-textarea-tab';

function MarkdownOnlyPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => registerMarkdownOnly(editor), [editor]);

  return null;
}

function ListTabPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => registerListTab(editor), [editor]);

  return null;
}

/*
 * Typing, undo, and lists that nest with Tab; only list items indent, since markdown has no other indent,
 * and Tab outside a list moves focus.
 * Pasted formatting markdown cannot write is stripped.
 */
export function EditingPlugins(): React.JSX.Element {
  return (
    <>
      <HistoryPlugin />
      <ListPlugin />
      <ListTabPlugin />
      <MarkdownShortcutPlugin transformers={richTextareaTransformers} />
      <MarkdownOnlyPlugin />
    </>
  );
}
