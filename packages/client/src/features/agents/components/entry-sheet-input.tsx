import type * as React from 'react';
import { View } from 'react-native';
import type { EntrySheetField } from './entry-sheet';
import { FieldMessage, FormInput, FormLabel } from './form-field';

// A labelled input with its error under it.
export function EntrySheetInput({
  field,
}: {
  field: EntrySheetField;
}): React.JSX.Element {
  return (
    <View className="gap-2">
      <FormLabel>{field.label}</FormLabel>
      <FormInput mono {...field} />
      <FieldMessage errors={field.errors} />
    </View>
  );
}
