import { useMemo, useSyncExternalStore } from 'react';
import { SuggestionRun } from './rich-textarea-suggestion-run';
import {
  slashQueryAtCaret,
  type SuggestionGroup,
  SuggestionSource,
} from './rich-textarea-suggestions';

const asksNothing = new SuggestionRun([], '');

/*
 * What the sources offer for a query, growing as their promises settle. A new query starts a new
 * run, so a late answer to an earlier one is never heard; null asks nothing.
 */
export function useSuggestionGroups(
  sources: readonly SuggestionSource[],
  query: string | null,
): SuggestionGroup[] | null {
  const run = useMemo(
    () => (query === null ? asksNothing : new SuggestionRun(sources, query)),
    [sources, query],
  );

  const groups = useSyncExternalStore(run.subscribe, run.groups);

  return groups.length > 0 ? groups : null;
}

// The text typed after the `/` word the caret is in, while the caret is one place and not a selection.
export function queryAt(
  value: string,
  caret: { collapsed: boolean; position: number },
): string | null {
  return caret.collapsed ? slashQueryAtCaret(value, caret.position) : null;
}
