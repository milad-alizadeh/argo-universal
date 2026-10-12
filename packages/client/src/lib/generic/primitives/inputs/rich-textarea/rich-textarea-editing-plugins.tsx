import { $isListItemNode } from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import type * as React from 'react';
import { useEffect } from 'react';
import { richTextareaTransformers } from './rich-textarea-markdown';
import { registerMarkdownOnly } from './rich-textarea-paste';

function MarkdownOnlyPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => registerMarkdownOnly(editor), [editor]);
  return null;
}

/*
 * Typing, undo, and lists that nest with Tab; only list items indent, since markdown has no other indent.
 * Pasted formatting markdown cannot write is stripped.
 */
export function EditingPlugins(): React.JSX.Element {
  return (
    <>
      <HistoryPlugin />
      <ListPlugin />
      <TabIndentationPlugin $canIndent={$isListItemNode} />
      <MarkdownShortcutPlugin transformers={richTextareaTransformers} />
      <MarkdownOnlyPlugin />
    </>
  );
}
