import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  type TriggerFn,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $createTextNode, type LexicalEditor, type TextNode } from 'lexical';
import { useMemo, useState } from 'react';
import type * as React from 'react';
import type {
  ReferenceOption,
  RichTextareaProps,
} from '../rich-textarea-props';
import {
  matchSuggestionTrigger,
  type SuggestionSource,
} from '../rich-textarea-suggestions';
import { ReferencePlugin } from './rich-textarea-reference-plugin';
import {
  SuggestionOption,
  renderSuggestionMenu,
} from './rich-textarea-suggestion-menu';

const resultLimit = 8;

type SelectOption = (
  option: SuggestionOption,
  node: TextNode | null,
  close: () => void,
) => void;

function useSelectSuggestion(editor: LexicalEditor): SelectOption {
  return (option, node, close) => {
    editor.update(() => {
      if (!node) return;

      const inserted = $createTextNode(option.suggestion.insert);
      node.replace(inserted);
      inserted.selectEnd();
    });
    close();
  };
}

function suggestionTrigger(sources: readonly SuggestionSource[]): TriggerFn {
  return (text) => {
    const match = matchSuggestionTrigger(text);

    return match &&
      sources.some((source) => source.query(match.matchingString).length > 0)
      ? match
      : null;
  };
}

function sourceOptions(
  source: SuggestionSource,
  query: string,
): SuggestionOption[] {
  return source
    .query(query)
    .slice(0, resultLimit)
    .map(
      (suggestion) => new SuggestionOption(suggestion, source.title, source.id),
    );
}

function useMenuOptions(
  sources: readonly SuggestionSource[],
  query: string | null,
): SuggestionOption[] {
  return useMemo(
    () =>
      query === null
        ? []
        : sources.flatMap((source) => sourceOptions(source, query)),
    [sources, query],
  );
}

interface MenuPluginProps {
  options: SuggestionOption[];
  onQueryChange: (query: string | null) => void;
  triggerFn: TriggerFn;
  onSelectOption: SelectOption;
}

function useSuggestionMenu(
  sources: readonly SuggestionSource[],
): MenuPluginProps {
  const [editor] = useLexicalComposerContext();
  const [query, onQueryChange] = useState<string | null>(null);
  const options = useMenuOptions(sources, query);
  const onSelectOption = useSelectSuggestion(editor);

  return {
    options,
    onQueryChange,
    triggerFn: suggestionTrigger(sources),
    onSelectOption,
  };
}

function SuggestionPlugin({
  sources,
}: {
  sources: readonly SuggestionSource[];
}): React.JSX.Element {
  return (
    <LexicalTypeaheadMenuPlugin
      {...useSuggestionMenu(sources)}
      menuRenderFn={renderSuggestionMenu}
      anchorClassName="z-50"
    />
  );
}

function SlashSuggestions({
  suggestions = [],
}: Pick<RichTextareaProps, 'suggestions'>): React.JSX.Element | null {
  return suggestions.length > 0 ? (
    <SuggestionPlugin sources={suggestions} />
  ) : null;
}

export function SuggestionPlugins({
  references,
  suggestions,
}: Pick<RichTextareaProps, 'suggestions'> & {
  references: readonly ReferenceOption[];
}): React.JSX.Element {
  return (
    <>
      {references.length > 0 && <ReferencePlugin references={references} />}
      <SlashSuggestions suggestions={suggestions} />
    </>
  );
}
