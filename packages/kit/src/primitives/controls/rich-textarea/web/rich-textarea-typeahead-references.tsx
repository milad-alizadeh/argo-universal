import type { TriggerFn } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import type * as React from 'react';
import {
  matchReferences,
  type ReferenceOption,
} from '../rich-textarea-references';
import { ReferenceGlyph } from './rich-textarea-reference-token';
import { $insertReference } from './rich-textarea-reference-tokens';
import {
  TypeaheadOption,
  type TypeaheadAdapter,
} from './rich-textarea-typeahead-option';

const numberClassName =
  'w-9 shrink-0 text-start type-secondary text-muted-foreground';

const titleClassName =
  'min-w-0 flex-1 truncate text-start type-control text-foreground';

function ReferenceContent({
  reference,
}: {
  reference: ReferenceOption;
}): React.JSX.Element {
  return (
    <>
      <ReferenceGlyph state={reference.state} />
      <span className={numberClassName}>#{reference.number}</span>
      <span className={titleClassName}>{reference.title}</span>
    </>
  );
}

function referenceOption(reference: ReferenceOption): TypeaheadOption {
  return new TypeaheadOption(
    `reference-${reference.number}`,
    {
      group: 'references',
      title: 'Issues and pull requests',
      content: <ReferenceContent reference={reference} />,
      className: 'items-center gap-2',
    },
    (node) => $insertReference(node, reference),
  );
}

export function referenceAdapter(
  references: readonly ReferenceOption[],
  trigger: TriggerFn,
): TypeaheadAdapter {
  return {
    trigger,
    options: (query) => matchReferences(references, query).map(referenceOption),
  };
}
