import type {
  RichTextarea,
  SuggestionResource,
  SuggestionSource,
} from '@repo/kit/primitives/controls/rich-textarea';
import type * as React from 'react';
import { useMemo } from 'react';
import { agentSources } from '../../utils/slash-command-suggestions';
import type { TextLayout } from './composer-card-types';
import type { ComposerDraft } from './composer-types';

const sameUris = (
  first: readonly SuggestionResource[],
  second: readonly SuggestionResource[],
): boolean =>
  first.length === second.length &&
  first.every(({ uri }, index) => uri === second[index]?.uri);

// The draft with its resources, and no `resources` key when there are none.
function withResources(
  { resources: _previous, ...draft }: ComposerDraft,
  resources: readonly SuggestionResource[],
): ComposerDraft {
  return resources.length > 0 ? { ...draft, resources } : draft;
}

type DraftChanges = Pick<
  React.ComponentProps<typeof RichTextarea>,
  'onChangeText' | 'onResourcesChange'
>;

export function draftChanges({
  draft,
  onDraftChange,
}: TextLayout['props']): DraftChanges {
  return {
    onChangeText: (text) => onDraftChange({ ...draft, text }),
    onResourcesChange: (resources) => {
      if (!sameUris(draft.resources ?? [], resources))
        onDraftChange(withResources(draft, resources));
    },
  };
}

export function useSuggestionSources(
  props: TextLayout['props'],
): SuggestionSource[] {
  const { slashCommands, suggestionSources } = props;

  return useMemo(
    () => [...agentSources(slashCommands), ...(suggestionSources ?? [])],
    [slashCommands, suggestionSources],
  );
}
