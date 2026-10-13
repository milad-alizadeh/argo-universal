import type { ComponentProps } from 'react';
import { useState } from 'react';
import type { Composer } from '../src/features/composer/components/composer/composer';

type ComposerArgs = ComponentProps<typeof Composer>;

export function useEditableComposerDraft(
  args: ComposerArgs,
): Pick<ComposerArgs, 'draft' | 'onDraftChange'> {
  const [draft, setDraft] = useState(args.draft);

  return {
    draft,
    onDraftChange: (next) => {
      setDraft(next);
      args.onDraftChange(next);
    },
  };
}
