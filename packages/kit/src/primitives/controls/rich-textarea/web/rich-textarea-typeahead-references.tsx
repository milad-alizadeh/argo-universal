import type { TriggerFn } from '@lexical/react/LexicalTypeaheadMenuPlugin';
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

function referenceOption(reference: ReferenceOption): TypeaheadOption {
  const title = `#${reference.number} ${reference.title}`;

  return new TypeaheadOption(
    {
      key: `reference-${reference.number}`,
      group: 'references',
      groupTitle: 'Issues and pull requests',
      title,
      leading: <ReferenceGlyph state={reference.state} />,
      label: title,
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
