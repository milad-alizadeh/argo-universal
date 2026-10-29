import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import type { TextNode } from 'lexical';
import { useEffect, useMemo, useState } from 'react';
import type * as React from 'react';
import type {
  ReferenceOption,
  RichTextareaProps,
} from '../rich-textarea-props';
import type { SuggestionSource } from '../rich-textarea-suggestions';
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

function useSuggestionAdapter(
  suggestions: readonly SuggestionSource[],
): TypeaheadAdapter {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () => registerCommandTokens(editor, suggestions),
    [editor, suggestions],
  );

  return useMemo(() => suggestionAdapter(suggestions), [suggestions]);
}

function useAdapters({
  references,
  suggestions = noSuggestions,
}: Props): TypeaheadAdapter[] {
  const reference = useReferenceAdapter(references);
  const suggestion = useSuggestionAdapter(suggestions);

  return useMemo(() => [reference, suggestion], [reference, suggestion]);
}

function useSelectOption(): SelectOption {
  const [editor] = useLexicalComposerContext();

  return (option, node, close) => {
    editor.update(() => option.insert(node));
    close();
  };
}

function useTypeahead(props: Props): MenuProps {
  const query = useTypeaheadQuery(useAdapters(props));
  const [menuOpen] = useState(() => new TypeaheadInteraction());
  useTypeaheadKeyboard(menuOpen, props.onSubmit);
  useEffect(() => (): void => menuOpen.close(), [menuOpen]);

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
