import type * as React from 'react';
import { View } from 'react-native';
import { Button } from '#lib/generic/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '#lib/generic/primitives/dialog';
import { Text } from '#lib/generic/primitives/text';
import { FieldMessage, FormLabel, FormInput } from './form-field';

export type EntrySheetField = {
  label: string;
  value: string;
  onChange: (value: string) => void;
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

// A phone edits one argument or variable at a time, with labelled fields.
export function EntrySheet(props: EntrySheetProps): React.JSX.Element {
  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="gap-4">
        <EntrySheetHeader {...props} />
        {props.fields.map((field) => (
          <EntrySheetInput key={field.label} field={field} />
        ))}
        {props.onRemove && <RemoveEntry {...props} />}
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

function EntrySheetHeader(props: EntrySheetProps): React.JSX.Element {
  return (
    <View className="flex-row items-center justify-between gap-2">
      <Button variant="ghost" size="sm" onPress={props.onClose}>
        <Text>Cancel</Text>
      </Button>
      <DialogTitle className="type-heading">{props.title}</DialogTitle>
      <SaveButton onPress={props.onSave} />
    </View>
  );
}

function SaveButton({ onPress }: { onPress: () => void }): React.JSX.Element {
  return (
    <Button size="sm" onPress={onPress}>
      <Text>Save</Text>
    </Button>
  );
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
    <Button variant="ghost" onPress={onRemove}>
      <Text className="text-destructive">{removeLabel}</Text>
    </Button>
  );
}
