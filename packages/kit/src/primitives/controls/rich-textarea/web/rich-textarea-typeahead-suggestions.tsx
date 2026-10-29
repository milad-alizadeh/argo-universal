import { $createTextNode, type TextNode } from 'lexical';
import type * as React from 'react';
import {
  querySuggestions,
  type ComposerSuggestion,
  type SuggestionGroup,
  type SuggestionSource,
} from '../rich-textarea-suggestions';
import { $insertCommand } from './rich-textarea-command-tokens';
import { suggestionTrigger } from './rich-textarea-suggestion-trigger';
import {
  TypeaheadOption,
  type TypeaheadAdapter,
} from './rich-textarea-typeahead-option';

function SuggestionContent({
  suggestion,
}: {
  suggestion: ComposerSuggestion;
}): React.JSX.Element {
  return (
    <>
      <span className="type-control text-foreground">{suggestion.label}</span>
      <SuggestionDetail detail={suggestion.detail} />
    </>
  );
}

function $insertText(node: TextNode, text: string): void {
  const inserted = $createTextNode(text);
  node.replace(inserted);
  inserted.selectEnd();
}

function insertSuggestion(
  node: TextNode | null,
  { insert, command }: ComposerSuggestion,
): void {
  if (!node) return;

  if (command) $insertCommand(node, command);
  else $insertText(node, insert);
}

function suggestionOption(
  source: SuggestionSource,
  suggestion: ComposerSuggestion,
): TypeaheadOption {
  const display = {
    title: source.title,
    content: <SuggestionContent suggestion={suggestion} />,
    className: 'flex-col gap-0.5',
  };

  return new TypeaheadOption(`${source.id}-${suggestion.id}`, display, (node) =>
    insertSuggestion(node, suggestion),
  );
}

function groupOptions({
  source,
  suggestions,
}: SuggestionGroup): TypeaheadOption[] {
  return suggestions.map((suggestion) => suggestionOption(source, suggestion));
}

interface Answers {
  ask: (query: string) => SuggestionGroup[];
  recall: (query: string) => SuggestionGroup[];
}

// `ask` queries the sources and keeps the answer; `recall` reuses it while the query is the same.
function answers(sources: readonly SuggestionSource[]): Answers {
  let latest: { query: string; groups: SuggestionGroup[] } | null = null;

  const ask = (query: string): SuggestionGroup[] => {
    latest = { query, groups: querySuggestions(sources, query) };

    return latest.groups;
  };

  return {
    ask,
    recall: (query) => (latest?.query === query ? latest.groups : ask(query)),
  };
}

// The trigger asks the sources once per change and the options recall that answer.
export function suggestionAdapter(
  sources: readonly SuggestionSource[],
): TypeaheadAdapter {
  const { ask, recall } = answers(sources);

  return {
    trigger: suggestionTrigger(ask),
    options: (query) => recall(query).flatMap(groupOptions),
  };
}

function SuggestionDetail({
  detail,
}: Pick<ComposerSuggestion, 'detail'>): React.JSX.Element | null {
  return detail ? (
    <span className="type-secondary text-muted-foreground">{detail}</span>
  ) : null;
}
