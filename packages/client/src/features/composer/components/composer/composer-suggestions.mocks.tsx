import type * as React from 'react';
import { useState } from 'react';
import { Composer } from './composer';
import type { ComposerProps } from './composer-types';

// A props-only Composer with the same controlled draft contract as its screen.
export function SuggestionComposer(props: ComposerProps): React.JSX.Element {
  const [draft, setDraft] = useState(props.draft);

  return (
    <Composer
      {...props}
      draft={draft}
      onDraftChange={(next) => {
        setDraft(next);
        props.onDraftChange(next);
      }}
    />
  );
}
