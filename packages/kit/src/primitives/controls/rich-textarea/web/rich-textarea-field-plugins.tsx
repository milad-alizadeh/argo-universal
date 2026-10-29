import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type * as React from 'react';
import { useEffect } from 'react';
import type { RichTextareaProps } from '../rich-textarea-props';
import {
  registerBlockShortcuts,
  registerListLines,
  registerMarkShortcuts,
} from './rich-textarea-keys';
import { registerLineMarkers } from './rich-textarea-line-markers';
import { useMarkdownValue } from './rich-textarea-value';

export function KeyboardPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => registerMarkShortcuts(editor), [editor]);
  useEffect(() => registerBlockShortcuts(editor), [editor]);
  useEffect(() => registerListLines(editor), [editor]);
  useEffect(() => registerLineMarkers(editor), [editor]);

  return null;
}

export function EditablePlugin({ editable }: { editable: boolean }): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => editor.setEditable(editable), [editor, editable]);

  return null;
}

export function MarkdownValuePlugin({
  value,
  onChangeText,
}: Pick<RichTextareaProps, 'value' | 'onChangeText'>): React.JSX.Element {
  const onChange = useMarkdownValue(value, onChangeText);

  return <OnChangePlugin ignoreSelectionChange onChange={onChange} />;
}
