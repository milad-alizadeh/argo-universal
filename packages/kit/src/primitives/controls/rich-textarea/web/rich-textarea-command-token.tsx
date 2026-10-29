import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getNodeByKey,
  $isTextNode,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';
import type * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  findCommand,
  type SuggestionSource,
} from '../rich-textarea-suggestions';
import { CommandTokenContext } from './rich-textarea-command-node';

const noSuggestions: readonly SuggestionSource[] = [];

// The sources a token's hint comes from; a token with no match still shows its name.
const SuggestionSourcesContext =
  createContext<readonly SuggestionSource[]>(noSuggestions);

function $isBlankTail(node: LexicalNode): boolean {
  return (
    $isTextNode(node) &&
    node.getTextContent().trim() === '' &&
    node.getNextSibling() === null
  );
}

// Nothing but a space follows the command, so no argument has been typed yet.
function $awaitsArgument(nodeKey: string): boolean {
  const next = $getNodeByKey(nodeKey)?.getNextSibling();

  return !next || $isBlankTail(next);
}

function readAwaiting(editor: LexicalEditor, nodeKey: string): boolean {
  return editor.getEditorState().read(() => $awaitsArgument(nodeKey));
}

function useAwaitsArgument(nodeKey: string): boolean {
  const [editor] = useLexicalComposerContext();
  const [awaits, setAwaits] = useState(() => readAwaiting(editor, nodeKey));
  useEffect(
    () =>
      editor.registerUpdateListener(() =>
        setAwaits(readAwaiting(editor, nodeKey)),
      ),
    [editor, nodeKey],
  );

  return awaits;
}

// Zero wide, so the hint hangs after the space the caret sits behind instead of pushing it along.
function CommandHint({ hint }: { hint?: string }): React.JSX.Element | null {
  if (!hint) return null;

  return (
    <span className="pointer-events-none inline-block w-0 select-none translate-x-3 overflow-visible whitespace-nowrap text-muted-foreground">
      {hint}
    </span>
  );
}

function AwaitingHint({
  name,
  nodeKey,
}: {
  name: string;
  nodeKey: string;
}): React.JSX.Element | null {
  const sources = useContext(SuggestionSourcesContext);
  const awaitsArgument = useAwaitsArgument(nodeKey);

  return awaitsArgument ? (
    <CommandHint hint={findCommand(sources, name)?.hint} />
  ) : null;
}

const tokenClassName =
  'mx-px inline-flex items-center rounded-sm bg-foreground/5 px-1 align-bottom';

const drawToken = (name: string, nodeKey: string): React.JSX.Element => (
  <>
    <span className={tokenClassName}>/{name}</span>
    <AwaitingHint name={name} nodeKey={nodeKey} />
  </>
);

export function CommandProviders({
  suggestions = noSuggestions,
  children,
}: {
  suggestions?: readonly SuggestionSource[];
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <SuggestionSourcesContext value={suggestions}>
      <CommandTokenContext value={drawToken}>{children}</CommandTokenContext>
    </SuggestionSourcesContext>
  );
}
