import type * as React from 'react';
import { TextInput } from '#primitives/inputs/text-input';
import { Host } from '#primitives/native/host';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type { EntrySheetField } from './entry-sheet';
import { EntrySheetInput as WideEntrySheetInput } from './entry-sheet-input.tsx';

// A phone sheet's field is a bare Material field, its label floating inside it and its error under it.
export function EntrySheetInput({
  field,
}: {
  field: EntrySheetField;
}): React.JSX.Element {
  if (useWide()) return <WideEntrySheetInput field={field} />;

  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <TextInput variant="row" mono {...field} />
    </Host>
  );
}
