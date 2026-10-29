import { $createTextNode, type LexicalEditor, type TextNode } from 'lexical';
import {
  findCommand,
  type SuggestionSource,
} from '../rich-textarea-suggestions';
import { $createCommandNode } from './rich-textarea-command-node';
import {
  registerTypedTokens,
  type TypedToken,
} from './rich-textarea-typed-tokens';

// `/name` at the start or after whitespace, and before whitespace or the end: the menu's own trigger rule.
const typedCommand = /(?<!\S)\/(\S+)(?=\s|$)/g;

// A match at the start of a text follows whatever came before it, which must be whitespace or nothing.
function startsWord(index: number, previous: string): boolean {
  return index > 0 || !/\S/.test(previous);
}

function nameOf(match: RegExpExecArray): string {
  return match[1] ?? '';
}

function isKnown(
  match: RegExpExecArray,
  previous: string,
  sources: readonly SuggestionSource[],
): boolean {
  return (
    startsWord(match.index, previous) &&
    findCommand(sources, nameOf(match)) !== undefined
  );
}

function tokenFor(match: RegExpExecArray): TypedToken {
  return {
    start: match.index,
    end: match.index + match[0].length,
    $create: () => $createCommandNode(nameOf(match)),
  };
}

function foundIn(
  text: string,
  previous: string,
  sources: readonly SuggestionSource[],
): TypedToken[] {
  return [...text.matchAll(typedCommand)].flatMap((match) =>
    isKnown(match, previous, sources) ? [tokenFor(match)] : [],
  );
}

/*
 * A typed or pasted `/name` that names a command a source offers becomes a token, so a draft loaded
 * with `/name args` shows it too. The name is left alone while it is being typed.
 */
export function registerCommandTokens(
  editor: LexicalEditor,
  sources: readonly SuggestionSource[],
): () => void {
  return registerTypedTokens(editor, (text, previous) =>
    foundIn(text, previous, sources),
  );
}

// What choosing a command leaves: the token and a space after it, the caret past both.
export function $insertCommand(node: TextNode | null, name: string): void {
  const space = $createTextNode(' ');
  const token = $createCommandNode(name);
  node?.replace(token);
  token.insertAfter(space);
  space.selectEnd();
}
