import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import {
  type InitialConfigType,
  LexicalComposer,
} from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import type * as React from 'react';
import { markdownMarkClassNames } from '#kit/markdown-marks';
import { cn } from '#kit/utils';
import {
  plainFieldClassName,
  type ReferenceOption,
  type RichTextareaProps,
} from './rich-textarea-props';
import { blockThemeClassNames } from './rich-textarea-theme';
import { EditingPlugins } from './web/rich-textarea-editing-plugins';
import {
  EditablePlugin,
  KeyboardPlugin,
  MarkdownValuePlugin,
} from './web/rich-textarea-field-plugins';
import { FormatBarPlugin } from './web/rich-textarea-format-bar-plugin';
import { HandlePlugin } from './web/rich-textarea-handle-plugin';
import { LinkPlugins } from './web/rich-textarea-link-plugins';
import {
  $importMarkdown,
  richTextareaNodes,
} from './web/rich-textarea-markdown';
import { TokenProviders } from './web/rich-textarea-token-providers';
import { TypeaheadPlugin } from './web/rich-textarea-typeahead-plugin';

const placeholderClassName =
  'pointer-events-none absolute inset-x-0 top-0 truncate type-control text-muted-foreground/70 dark:text-muted-foreground';

function Placeholder({
  text,
  className,
}: {
  text: string;
  className?: string;
}): React.JSX.Element {
  return <div className={cn(placeholderClassName, className)}>{text}</div>;
}

type MessageFieldProps = Pick<
  RichTextareaProps,
  'accessibilityLabel' | 'placeholder' | 'fieldClassName'
>;

// Ten 20px lines, plus the 20px of vertical padding the Composer puts on the field.
const editableClassName = cn(
  plainFieldClassName,
  'max-h-55 overflow-y-auto whitespace-pre-wrap break-words text-foreground outline-none',
);

function MessageEditable(props: MessageFieldProps): React.JSX.Element {
  const { accessibilityLabel, placeholder = '', fieldClassName } = props;
  const hint = <Placeholder text={placeholder} className={fieldClassName} />;

  return (
    <ContentEditable
      aria-label={accessibilityLabel}
      aria-multiline
      aria-placeholder={placeholder}
      placeholder={hint}
      className={cn(editableClassName, fieldClassName)}
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
      <LinkPlugins />
      <FormatBarPlugin />
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

const noReferences: readonly ReferenceOption[] = [];

type EditorParts = Omit<RichTextareaProps, 'disabled' | 'references'> & {
  editable: boolean;
  references: readonly ReferenceOption[];
};

function EditorParts({ references, ...props }: EditorParts): React.JSX.Element {
  return (
    <>
      <MessageField {...props} />
      <TypeaheadPlugin {...props} references={references} />
      <EditingPlugins />
      <KeyboardPlugin />
      <EditablePlugin editable={props.editable} />
      {props.autoFocus && <AutoFocusPlugin />}
      <MarkdownValuePlugin {...props} />
      <HandlePlugin handle={props.ref} />
    </>
  );
}

// The web drawing: a Lexical editor that shows markdown as you type, growing to 10 lines, then scrolling.
function RichTextarea({
  disabled = false,
  references = noReferences,
  ...props
}: RichTextareaProps): React.JSX.Element {
  const editable = !disabled;

  return (
    <LexicalComposer initialConfig={editorConfig(props.value, editable)}>
      <TokenProviders references={references} suggestions={props.suggestions}>
        <EditorParts {...props} editable={editable} references={references} />
      </TokenProviders>
    </LexicalComposer>
  );
}

export { RichTextarea };

RichTextarea satisfies React.ComponentType<RichTextareaProps>;
