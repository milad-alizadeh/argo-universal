import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import type { LexicalEditor, TextNode } from 'lexical';
import type * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  matchReferences,
  type ReferenceOption,
} from '../rich-textarea-references';
import {
  ReferenceMenuOption,
  renderReferenceMenu,
} from './rich-textarea-reference-menu';
import {
  $insertReference,
  registerReferenceTokens,
} from './rich-textarea-reference-tokens';

function useMenuOptions(
  references: readonly ReferenceOption[],
  query: string | null,
): ReferenceMenuOption[] {
  return useMemo(() => {
    if (query === null) return [];

    return matchReferences(references, query).map(
      (reference) => new ReferenceMenuOption(reference),
    );
  }, [references, query]);
}

function useReferenceTokens(
  editor: LexicalEditor,
  references: readonly ReferenceOption[],
): void {
  useEffect(
    () => registerReferenceTokens(editor, references),
    [editor, references],
  );
}

type SelectOption = (
  option: ReferenceMenuOption,
  node: TextNode | null,
  closeMenu: () => void,
) => void;

function useSelectReference(editor: LexicalEditor): SelectOption {
  return (option, node, closeMenu) => {
    editor.update(() => $insertReference(node, option.reference));
    closeMenu();
  };
}

interface MenuPluginProps {
  options: ReferenceMenuOption[];
  onQueryChange: (query: string | null) => void;
  onSelectOption: SelectOption;
}

function ReferenceMenuPlugin(props: MenuPluginProps): React.JSX.Element {
  return (
    <LexicalTypeaheadMenuPlugin<ReferenceMenuOption>
      {...props}
      triggerFn={useBasicTypeaheadTriggerMatch('#', { minLength: 0 })}
      menuRenderFn={renderReferenceMenu}
      anchorClassName="z-50"
    />
  );
}

/*
 * `#` after a space opens the Issues and pull requests that match what follows it, by number or
 * title (ADR-0023). `#` and a space stays plain text, so the menu never opens on that.
 */
export function ReferencePlugin(props: {
  references: readonly ReferenceOption[];
}): React.JSX.Element {
  const { references } = props;
  const [editor] = useLexicalComposerContext();
  const [query, setQuery] = useState<string | null>(null);
  useReferenceTokens(editor, references);

  return (
    <ReferenceMenuPlugin
      options={useMenuOptions(references, query)}
      onSelectOption={useSelectReference(editor)}
      onQueryChange={setQuery}
    />
  );
}
