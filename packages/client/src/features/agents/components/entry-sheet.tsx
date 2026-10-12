import type * as React from 'react';
import { View } from 'react-native';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '#lib/generic/primitives/dialog';
import { Button } from '../../../lib/generic/primitives/button';
import { useWide } from '../../../lib/generic/use-wide';
import { FieldMessage, FormLabel, FormInput } from './form-field';

export type EntrySheetField = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
};
export type EntrySheetProps = {
  title: string;
  fields: readonly EntrySheetField[];
  onSave: () => void;
  onClose: () => void;
  onRemove?: () => void;
  removeLabel: string;
};

// A phone edits one argument or variable at a time, with labelled fields, in a sheet that the backdrop closes.
export function EntrySheet(props: EntrySheetProps): React.JSX.Element {
  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent accessibilityLabel={props.title}>
        <DialogTitle className="type-heading">{props.title}</DialogTitle>
        <View className="gap-4">
          {props.fields.map((field) => (
            <EntrySheetInput key={field.label} field={field} />
          ))}
        </View>
        <EntrySheetActions {...props} />
      </DialogContent>
    </Dialog>
  );
}

// The remove action of an existing entry: removing it also closes the sheet.
export const removalOf = (
  index: number | null,
  remove: (index: number) => void,
  close: () => void,
): (() => void) | undefined =>
  index === null
    ? undefined
    : () => {
        remove(index);
        close();
      };

// Save fills a phone sheet's foot; a wide dialog puts Cancel beside it.
function EntrySheetActions(props: EntrySheetProps): React.JSX.Element {
  return (
    <View className="gap-3">
      <View className="flex-row justify-end gap-2">
        {useWide() && <CancelEntry onClose={props.onClose} />}
        <Button fullWidth="narrow" onPress={props.onSave} label={'Save'} />
      </View>
      {props.onRemove && <RemoveEntry {...props} />}
    </View>
  );
}

function CancelEntry({
  onClose,
}: Pick<EntrySheetProps, 'onClose'>): React.JSX.Element {
  return <Button variant="outline" onPress={onClose} label={'Cancel'} />;
}

function EntrySheetInput({
  field,
}: {
  field: EntrySheetField;
}): React.JSX.Element {
  const errors = field.error ? [field.error] : [];
  return (
    <View className="gap-2">
      <FormLabel>{field.label}</FormLabel>
      <FormInput mono {...field} errors={errors} />
      <FieldMessage errors={errors} />
    </View>
  );
}

function RemoveEntry({
  onRemove,
  removeLabel,
}: EntrySheetProps): React.JSX.Element {
  return (
    <Button
      variant="ghost"
      fullWidth="narrow"
      onPress={onRemove}
      label={removeLabel}
      {...destructiveAction}
    />
  );
}

const destructiveAction = { role: 'destructive' } as const;
