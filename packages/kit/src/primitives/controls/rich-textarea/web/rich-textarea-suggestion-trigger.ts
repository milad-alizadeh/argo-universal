import type {
  MenuTextMatch,
  TriggerFn,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $getSelection, $isRangeSelection, type LexicalNode } from 'lexical';
import {
  matchSuggestionTrigger,
  type SuggestionGroup,
} from '../rich-textarea-suggestions';

function $beforeInlineParent(node: LexicalNode): string {
  const parent = node.getParent();

  if (!parent) return '';

  return parent.isInline() ? $precedingCharacter(parent) : '';
}

function $precedingCharacter(node: LexicalNode): string {
  const previous = node.getPreviousSibling();

  if (!previous) return $beforeInlineParent(node);

  return previous.getTextContent().slice(-1) || $precedingCharacter(previous);
}

function $atWordStart(): boolean {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) return false;
  const previous = $precedingCharacter(selection.anchor.getNode());

  return previous === '' || /\s/.test(previous);
}

function $startsSlashWord(leadOffset: number): boolean {
  return leadOffset > 0 || $atWordStart();
}

function $validMatch(text: string): MenuTextMatch | null {
  const match = matchSuggestionTrigger(text);

  if (!match) return null;

  return $startsSlashWord(match.leadOffset) ? match : null;
}

export function suggestionTrigger(
  ask: (query: string) => SuggestionGroup[],
): TriggerFn {
  return (text) => {
    const match = $validMatch(text);

    return match && ask(match.matchingString).length > 0 ? match : null;
  };
}
