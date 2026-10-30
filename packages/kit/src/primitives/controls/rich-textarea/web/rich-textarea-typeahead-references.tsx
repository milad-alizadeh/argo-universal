import type { TriggerFn } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import type * as React from 'react';
import { Text } from '#primitives/content/text';
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

// A fixed lane, so every row's title starts on one x however many digits the number has.
const numberClassName = 'w-9 shrink-0 text-start text-muted-foreground';

function ReferenceLead({
  reference,
}: {
  reference: ReferenceOption;
}): React.JSX.Element {
  return (
    <>
      <ReferenceGlyph state={reference.state} />
      <Text role="secondary" className={numberClassName}>
        #{reference.number}
      </Text>
    </>
  );
}

function referenceOption(reference: ReferenceOption): TypeaheadOption {
  return new TypeaheadOption(
    {
      key: `reference-${reference.number}`,
      group: 'references',
      groupTitle: 'Issues and pull requests',
      title: reference.title,
      leading: <ReferenceLead reference={reference} />,
      // The number leads the row as it reads, though it is drawn in its own lane.
      label: `#${reference.number} ${reference.title}`,
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
