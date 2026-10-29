import { $createTextNode, type TextNode } from 'lexical';
import type * as React from 'react';
import {
  findCommand,
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

// A result is a command token only when its source lists the command, as a typed `/name` must be.
function listedCommand(
  sources: readonly SuggestionSource[],
  command: string | undefined,
): string | undefined {
  return command !== undefined && findCommand(sources, command)
    ? command
    : undefined;
}

function insertSuggestion(
  node: TextNode | null,
  sources: readonly SuggestionSource[],
  { insert, command }: ComposerSuggestion,
): void {
  if (!node) return;
  const name = listedCommand(sources, command);

  if (name) $insertCommand(node, name);
  else $insertText(node, insert);
}

function suggestionOption(
  sources: readonly SuggestionSource[],
  source: SuggestionSource,
  suggestion: ComposerSuggestion,
): TypeaheadOption {
  const display = {
    title: source.title,
    content: <SuggestionContent suggestion={suggestion} />,
    className: 'flex-col gap-0.5',
  };

  return new TypeaheadOption(`${source.id}-${suggestion.id}`, display, (node) =>
    insertSuggestion(node, sources, suggestion),
  );
}

const groupOptions =
  (sources: readonly SuggestionSource[]) =>
  ({ source, suggestions }: SuggestionGroup): TypeaheadOption[] =>
    suggestions.map((suggestion) =>
      suggestionOption(sources, source, suggestion),
    );

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
    options: (query) => recall(query).flatMap(groupOptions(sources)),
  };
}

function SuggestionDetail({
  detail,
}: Pick<ComposerSuggestion, 'detail'>): React.JSX.Element | null {
  return detail ? (
    <span className="type-secondary text-muted-foreground">{detail}</span>
  ) : null;
}
