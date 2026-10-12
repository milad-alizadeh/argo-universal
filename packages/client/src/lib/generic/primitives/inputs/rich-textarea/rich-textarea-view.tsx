import { $isListItemNode } from '@lexical/list';
import {
  type InitialConfigType,
  LexicalComposer,
} from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import type * as React from 'react';
import { useEffect } from 'react';
import { markdownMarkClassNames } from '#lib/generic/markdown-marks';
import { cn } from '#lib/generic/utils';
import {
  registerBlockShortcuts,
  registerMarkShortcuts,
  registerReturnToSubmit,
} from './rich-textarea-keys';
import {
  $importMarkdown,
  richTextareaNodes,
  richTextareaTransformers,
} from './rich-textarea-markdown';
import {
  plainFieldClassName,
  type RichTextareaProps,
} from './rich-textarea-props';
import { blockThemeClassNames } from './rich-textarea-theme';
import { useMarkdownValue } from './rich-textarea-value';

function KeyboardPlugin({
  onSubmit,
}: Pick<RichTextareaProps, 'onSubmit'>): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => registerMarkShortcuts(editor), [editor]);
  useEffect(() => registerBlockShortcuts(editor), [editor]);
  useEffect(
    () => onSubmit && registerReturnToSubmit(editor, onSubmit),
    [editor, onSubmit],
  );
  return null;
}

// Typing, undo, and lists that nest with Tab; only list items indent, since markdown has no other indent.
function EditingPlugins(): React.JSX.Element {
  return (
    <>
      <HistoryPlugin />
      <ListPlugin />
      <TabIndentationPlugin $canIndent={$isListItemNode} />
      <MarkdownShortcutPlugin transformers={richTextareaTransformers} />
    </>
  );
}

function EditablePlugin({ editable }: { editable: boolean }): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => editor.setEditable(editable), [editor, editable]);
  return null;
}

function MarkdownValuePlugin({
  value,
  onChangeText,
}: Pick<RichTextareaProps, 'value' | 'onChangeText'>): null {
  useMarkdownValue(value, onChangeText);
  return null;
}

function Placeholder({ text }: { text: string }): React.JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 truncate type-control text-muted-foreground/70">
      {text}
    </div>
  );
}

type MessageFieldProps = Pick<
  RichTextareaProps,
  'accessibilityLabel' | 'placeholder'
>;

const editableClassName = cn(
  plainFieldClassName,
  'max-h-[10lh] overflow-y-auto whitespace-pre-wrap break-words text-foreground outline-none',
);

function MessageEditable({
  accessibilityLabel,
  placeholder = '',
}: MessageFieldProps): React.JSX.Element {
  return (
    <ContentEditable
      aria-label={accessibilityLabel}
      aria-multiline
      aria-placeholder={placeholder}
      placeholder={<Placeholder text={placeholder} />}
      className={editableClassName}
    />
  );
}

function MessageField({
  editable,
  ...props
}: MessageFieldProps & { editable: boolean }): React.JSX.Element {
  return (
    <div className={cn('relative w-full', !editable && 'opacity-50')}>
      <RichTextPlugin
        contentEditable={<MessageEditable {...props} />}
        ErrorBoundary={LexicalErrorBoundary}
      />
    </div>
  );
}

const theme: InitialConfigType['theme'] = {
  text: markdownMarkClassNames,
  ...blockThemeClassNames,
};

function editorConfig(value: string, editable: boolean): InitialConfigType {
  return {
    namespace: 'RichTextarea',
    nodes: richTextareaNodes,
    theme,
    editable,
    editorState: () => $importMarkdown(value),
    onError: (error) => {
      throw error;
    },
  };
}

// The web drawing: a Lexical editor that shows markdown as you type, growing to 10 lines, then scrolling.
function RichTextarea({
  editable = true,
  ...props
}: RichTextareaProps): React.JSX.Element {
  return (
    <LexicalComposer initialConfig={editorConfig(props.value, editable)}>
      <MessageField {...props} editable={editable} />
      <EditingPlugins />
      <KeyboardPlugin onSubmit={props.onSubmit} />
      <EditablePlugin editable={editable} />
      <MarkdownValuePlugin {...props} />
    </LexicalComposer>
  );
}

export { RichTextarea };
