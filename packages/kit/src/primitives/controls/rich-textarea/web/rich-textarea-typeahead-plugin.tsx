import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $getSelection, $isRangeSelection, type TextNode } from 'lexical';
import { useEffect, useMemo, useState } from 'react';
import type * as React from 'react';
import type {
  ReferenceOption,
  RichTextareaProps,
} from '../rich-textarea-props';
import type {
  ComposerSuggestion,
  SuggestionSource,
} from '../rich-textarea-suggestions';
import { registerCommandTokens } from './rich-textarea-command-tokens';
import { registerReturnToSubmit } from './rich-textarea-keys';
import { registerReferenceTokens } from './rich-textarea-reference-tokens';
import { renderTypeaheadMenu } from './rich-textarea-typeahead-menu';
import {
  type TypeaheadAdapter,
  type TypeaheadOption,
  TypeaheadInteraction,
} from './rich-textarea-typeahead-option';
import {
  useTypeaheadQuery,
  type TypeaheadQuery,
} from './rich-textarea-typeahead-query';
import { referenceAdapter } from './rich-textarea-typeahead-references';
import { suggestionAdapter } from './rich-textarea-typeahead-suggestions';

type Props = Pick<RichTextareaProps, 'suggestions' | 'onSubmit'> & {
  references: readonly ReferenceOption[];
  // Called with a result chosen from a source, after its text is written.
  onChooseSuggestion?: (suggestion: ComposerSuggestion) => void;
};

type SelectOption = (
  option: TypeaheadOption,
  node: TextNode | null,
  close: () => void,
) => void;

type MenuProps = TypeaheadQuery & {
  onSelectOption: SelectOption;
  onOpen: () => void;
  onClose: () => void;
};

const noSuggestions: readonly SuggestionSource[] = [];

function useReferenceAdapter(
  references: readonly ReferenceOption[],
): TypeaheadAdapter {
  const [editor] = useLexicalComposerContext();
  const trigger = useBasicTypeaheadTriggerMatch('#', { minLength: 0 });
  useEffect(
    () => registerReferenceTokens(editor, references),
    [editor, references],
  );

  return useMemo(
    () => referenceAdapter(references, trigger),
    [references, trigger],
  );
}

/*
 * Lexical looks for a trigger only when the editor changes, so a new source list nudges the caret.
 * Only a focused editor is nudged, and without touching the DOM selection, so a list arriving while
 * the person is in a picker or popover never pulls focus into the editor.
 */
function useRetriggerOnChange(adapters: TypeaheadAdapter[]): void {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.getRootElement()?.contains(document.activeElement)) return;
    editor.update(
      () => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) selection.dirty = true;
      },
      { tag: 'skip-dom-selection' },
    );
  }, [editor, adapters]);
}

function useSuggestionAdapter(
  suggestions: readonly SuggestionSource[],
  choose: Props['onChooseSuggestion'],
): TypeaheadAdapter {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () => registerCommandTokens(editor, suggestions),
    [editor, suggestions],
  );

  return useMemo(
    () => suggestionAdapter(suggestions, choose),
    [suggestions, choose],
  );
}

function useAdapters({
  references,
  suggestions = noSuggestions,
  onChooseSuggestion,
}: Props): TypeaheadAdapter[] {
  const reference = useReferenceAdapter(references);
  const suggestion = useSuggestionAdapter(suggestions, onChooseSuggestion);

  const adapters = useMemo(
    () => [reference, suggestion],
    [reference, suggestion],
  );

  useRetriggerOnChange(adapters);

  return adapters;
}

function useSelectOption(): SelectOption {
  const [editor] = useLexicalComposerContext();

  return (option, node, close) => {
    editor.update(() => option.insert(node));
    close();
  };
}

// The menu counts as open only while it shows options, and closes with the editor.
function useMenuLifetime(menu: TypeaheadInteraction, options: number): void {
  useEffect(() => menu.show(options), [menu, options]);
  useEffect(() => (): void => menu.close(), [menu]);
}

function useTypeahead(props: Props): MenuProps {
  const query = useTypeaheadQuery(useAdapters(props));
  const [menuOpen] = useState(() => new TypeaheadInteraction());
  useTypeaheadKeyboard(menuOpen, props.onSubmit);
  useMenuLifetime(menuOpen, query.options.length);

  return {
    ...query,
    onSelectOption: useSelectOption(),
    onOpen: menuOpen.open,
    onClose: menuOpen.close,
  };
}

// Both triggers share the menu lifetime, keyboard selection, focus and viewport rules.
export function TypeaheadPlugin(props: Props): React.JSX.Element {
  return (
    <LexicalTypeaheadMenuPlugin
      {...useTypeahead(props)}
      menuRenderFn={renderTypeaheadMenu}
      anchorClassName="z-50"
    />
  );
}

function useTypeaheadKeyboard(
  menu: TypeaheadInteraction,
  submit: RichTextareaProps['onSubmit'],
): void {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () => submit && registerReturnToSubmit(editor, submit, menu.isOpen),
    [editor, submit, menu],
  );
}
