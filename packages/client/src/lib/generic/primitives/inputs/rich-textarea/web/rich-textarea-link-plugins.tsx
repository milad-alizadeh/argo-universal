import { AutoLinkPlugin } from '@lexical/react/LexicalAutoLinkPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import type { LexicalEditor } from 'lexical';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { isLinkUrl } from '#lib/generic/link-url';
import { LinkEditor, type LinkEditorProps } from '../rich-textarea-link-editor';
import type { LinkFields } from '../rich-textarea-link-form';
import {
  $saveLink,
  type LinkTarget,
  registerLinkEditor,
} from './rich-textarea-link-editing';
import { urlLinkedOnSpace } from './rich-textarea-links';
import { placementInField } from './rich-textarea-placement';

const urlMatchers = [urlLinkedOnSpace];

// What the link editor shows: the selected text and link, beside the selection inside the field.
function shownTarget(
  editor: LexicalEditor,
  { fields, rect }: LinkTarget,
): LinkEditorProps['target'] {
  const placement = placementInField(editor, rect);
  return placement && { fields, placement };
}

interface LinkEditorState {
  target?: LinkTarget;
  save: (fields: LinkFields) => void;
  close: () => void;
}

function useLinkEditor(editor: LexicalEditor): LinkEditorState {
  const [target, setTarget] = useState<LinkTarget>();
  useEffect(() => registerLinkEditor(editor, setTarget), [editor]);
  const close = (): void => setTarget(undefined);
  const save = (fields: LinkFields): void => {
    if (target) editor.update(() => $saveLink(target.selection, fields));
    close();
  };
  return { target, save, close };
}

function LinkEditorPlugin(): React.JSX.Element {
  const [editor] = useLexicalComposerContext();
  const { target, save, close } = useLinkEditor(editor);
  return (
    <LinkEditor
      target={target && shownTarget(editor, target)}
      onSave={save}
      onClose={close}
      onClosed={() => editor.focus()}
    />
  );
}

// Links: pasting a URL over a selection, a URL linking itself as you type on, and ⌘K's editor.
export function LinkPlugins(): React.JSX.Element {
  return (
    <>
      <LinkPlugin validateUrl={isLinkUrl} />
      <AutoLinkPlugin matchers={urlMatchers} />
      <LinkEditorPlugin />
    </>
  );
}
