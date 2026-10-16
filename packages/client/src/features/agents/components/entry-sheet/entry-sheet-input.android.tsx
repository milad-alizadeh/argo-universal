import type * as React from 'react';
import { TextInput } from '#primitives/inputs/text-input';
import { Host } from '#primitives/native/host';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import type { EntrySheetField } from './entry-sheet';
import { EntrySheetInput as WideEntrySheetInput } from './entry-sheet-input.tsx';

interface FieldProps {
  field: EntrySheetField;
}

export function EntrySheetInput({ field }: FieldProps): React.JSX.Element {
  return (
    <SizeClass
      compact={<MaterialField field={field} />}
      wide={<WideEntrySheetInput field={field} />}
    />
  );
}

// A phone sheet's field is a bare Material field, its label floating inside it and its error under it.
function MaterialField({ field }: FieldProps): React.JSX.Element {
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <TextInput variant="row" mono {...field} />
    </Host>
  );
}
