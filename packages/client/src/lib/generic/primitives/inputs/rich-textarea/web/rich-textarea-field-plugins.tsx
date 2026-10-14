import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import type { RichTextareaProps } from '../rich-textarea-props';
import {
  registerBlockShortcuts,
  registerListLines,
  registerMarkShortcuts,
  registerReturnToSubmit,
} from './rich-textarea-keys';
import { registerLineMarkers } from './rich-textarea-line-markers';
import { useMarkdownValue } from './rich-textarea-value';

export function KeyboardPlugin({
  onSubmit,
}: Pick<RichTextareaProps, 'onSubmit'>): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => registerMarkShortcuts(editor), [editor]);
  useEffect(() => registerBlockShortcuts(editor), [editor]);
  useEffect(() => registerListLines(editor), [editor]);
  useEffect(() => registerLineMarkers(editor), [editor]);
  useEffect(
    () => onSubmit && registerReturnToSubmit(editor, onSubmit),
    [editor, onSubmit],
  );

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
}: Pick<RichTextareaProps, 'value' | 'onChangeText'>): null {
  useMarkdownValue(value, onChangeText);

  return null;
}
