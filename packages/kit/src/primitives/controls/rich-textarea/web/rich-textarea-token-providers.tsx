import type * as React from 'react';
import type { ReferenceOption } from '../rich-textarea-references';
import type { SuggestionSource } from '../rich-textarea-suggestions';
import { CommandProviders } from './rich-textarea-command-token';
import { ReferenceProviders } from './rich-textarea-reference-token';

// What the tokens in the field draw from: the references and the suggestion sources.
export function TokenProviders({
  references,
  suggestions,
  children,
}: {
  references: readonly ReferenceOption[];
  suggestions?: readonly SuggestionSource[];
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ReferenceProviders references={references}>
      <CommandProviders suggestions={suggestions}>{children}</CommandProviders>
    </ReferenceProviders>
  );
}
