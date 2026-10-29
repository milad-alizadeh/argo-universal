import { $createTextNode, type TextNode } from 'lexical';
import type * as React from 'react';
import {
  findCommand,
  startSuggestionQuery,
  type ComposerSuggestion,
  type SuggestionGroup,
  type SuggestionRun,
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
  suggestion: ComposerSuggestion,
): void {
  if (!node) return;
  const { insert, command } = suggestion;
  const name = listedCommand(sources, command);

  if (name) $insertCommand(node, name);
  else $insertText(node, insert);
}

type Choose = (suggestion: ComposerSuggestion) => void;

function suggestionOption(
  sources: readonly SuggestionSource[],
  choose: Choose | undefined,
  source: SuggestionSource,
  suggestion: ComposerSuggestion,
): TypeaheadOption {
  const display = {
    title: source.title,
    content: <SuggestionContent suggestion={suggestion} />,
    className: 'flex-col gap-0.5',
  };

  return new TypeaheadOption(
    `${source.id}-${suggestion.id}`,
    display,
    (node) => {
      insertSuggestion(node, sources, suggestion);
      choose?.(suggestion);
    },
  );
}

const groupOptions =
  (sources: readonly SuggestionSource[], choose: Choose | undefined) =>
  ({ source, suggestions }: SuggestionGroup): TypeaheadOption[] =>
    suggestions.map((suggestion) =>
      suggestionOption(sources, choose, source, suggestion),
    );

interface Answers {
  ask: (query: string) => SuggestionRun;
  recall: (query: string) => SuggestionRun;
  forget: () => void;
  subscribe: (listener: () => void) => () => void;
}

/*
 * `ask` queries the sources once for a query and keeps the run; `recall` reuses it while the query is
 * the same. Asking again drops the previous run, so a late answer to an earlier query is never heard.
 */
function answers(sources: readonly SuggestionSource[]): Answers {
  let latest: { query: string; run: SuggestionRun; stop: () => void } | null =
    null;
  const listeners = new Set<() => void>();

  const forget = (): void => {
    latest?.stop();
    latest = null;
  };

  const ask = (query: string): SuggestionRun => {
    if (latest?.query === query) return latest.run;
    forget();
    const run = startSuggestionQuery(sources, query);
    const stop = run.subscribe(() =>
      listeners.forEach((listener) => listener()),
    );
    latest = { query, run, stop };

    return run;
  };

  return {
    ask,
    forget,
    recall: (query) => (latest?.query === query ? latest.run : ask(query)),
    subscribe: (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
  };
}

// The trigger asks the sources once per change and the options recall that answer.
export function suggestionAdapter(
  sources: readonly SuggestionSource[],
  choose?: Choose,
): TypeaheadAdapter {
  const { ask, recall, forget, subscribe } = answers(sources);

  return {
    trigger: suggestionTrigger(ask, forget),
    options: (query) =>
      recall(query).groups().flatMap(groupOptions(sources, choose)),
    pending: (query) => recall(query).pending(),
    subscribe,
  };
}

function SuggestionDetail({
  detail,
}: Pick<ComposerSuggestion, 'detail'>): React.JSX.Element | null {
  return detail ? (
    <span className="type-secondary text-muted-foreground">{detail}</span>
  ) : null;
}
