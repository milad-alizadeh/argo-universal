import { $createTextNode, type TextNode } from 'lexical';
import type * as React from 'react';
import {
  commandName,
  type ComposerSuggestion,
  type SuggestionSource,
} from '../rich-textarea-suggestions';
import { $insertCommand } from './rich-textarea-command-tokens';
import { suggestionTrigger } from './rich-textarea-suggestion-trigger';
import {
  TypeaheadOption,
  type TypeaheadAdapter,
} from './rich-textarea-typeahead-option';

const resultLimit = 8;

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

function $insertResult(node: TextNode, insert: string): void {
  const name = commandName(insert);

  if (name) $insertCommand(node, name);
  else $insertText(node, insert);
}

function insertSuggestion(
  node: TextNode | null,
  { insert }: ComposerSuggestion,
): void {
  if (node) $insertResult(node, insert);
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

function sourceOptions(
  source: SuggestionSource,
  query: string,
): TypeaheadOption[] {
  return source
    .query(query)
    .slice(0, resultLimit)
    .map((suggestion) => suggestionOption(source, suggestion));
}

export function suggestionAdapter(
  sources: readonly SuggestionSource[],
): TypeaheadAdapter {
  return {
    trigger: suggestionTrigger(sources),
    options: (query) =>
      sources.flatMap((source) => sourceOptions(source, query)),
  };
}

function SuggestionDetail({
  detail,
}: Pick<ComposerSuggestion, 'detail'>): React.JSX.Element | null {
  return detail ? (
    <span className="type-secondary text-muted-foreground">{detail}</span>
  ) : null;
}
