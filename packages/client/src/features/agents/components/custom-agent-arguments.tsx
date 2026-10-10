import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { useWide } from '../../../lib/generic/use-wide';
import type { CustomAgentFormApi } from '../hooks/use-custom-agent-form';
import {
  type ArgumentsField,
  type Editing,
  ArgumentSheet,
  newArgument,
} from './argument-sheet';
import {
  AddEntry,
  EntryList,
  type EntryListItem,
  RemoveEntryButton,
} from './entry-controls';
import {
  FieldMessage,
  FormInput,
  FormLabel,
  type TextField,
  fieldInput,
} from './form-field';
import { keyedRows } from './keyed-rows';

type SectionProps = { form: CustomAgentFormApi; disabled: boolean };
type BodyProps = SectionProps & { field: ArgumentsField };
type RowProps = BodyProps & { index: number };
type InputProps = {
  item: TextField;
  index: number;
  disabled: boolean;
};
const argumentHint = 'Each argument is passed exactly as typed, in this order.';

export function CustomAgentArguments(props: SectionProps): React.JSX.Element {
  return (
    <props.form.Field name="args" mode="array">
      {(field) => <ArgumentsBody {...props} field={field} />}
    </props.form.Field>
  );
}

function ArgumentsBody(props: BodyProps): React.JSX.Element {
  return (
    <View className="gap-2 pt-4">
      <FormLabel>Arguments</FormLabel>
      <ArgumentList {...props} />
      <FieldMessage hint={argumentHint} errors={[]} />
    </View>
  );
}

function ArgumentList(props: BodyProps): React.JSX.Element {
  if (useWide()) return <ArgumentInputs {...props} />;
  return <ArgumentRows {...props} />;
}

function ArgumentInputs(props: BodyProps): React.JSX.Element {
  return (
    <>
      {keyedRows(props.field.state.value).map((row) => (
        <ArgumentInput key={row.key} {...props} index={row.index} />
      ))}
      <AddEntry
        label="Add argument"
        disabled={props.disabled}
        onPress={() => props.field.pushValue('')}
      />
    </>
  );
}

function ArgumentInput(props: RowProps): React.JSX.Element {
  return (
    <props.form.Field name={`args[${props.index}]`}>
      {(item) => <ArgumentInputRow {...props} item={item} />}
    </props.form.Field>
  );
}

function ArgumentInputRow(props: RowProps & InputProps): React.JSX.Element {
  const { index, disabled } = props;
  return (
    <View className="flex-row items-center gap-2">
      <ArgumentTextInput item={props.item} index={index} disabled={disabled} />
      <RemoveEntryButton
        label={`Remove argument ${index + 1}`}
        disabled={disabled}
        onPress={() => props.field.removeValue(index)}
      />
    </View>
  );
}

function ArgumentTextInput(props: InputProps): React.JSX.Element {
  return (
    <FormInput
      mono
      className="flex-1"
      label={`Argument ${props.index + 1}`}
      {...fieldInput(props.item)}
      disabled={props.disabled}
    />
  );
}

function ArgumentEntries(
  props: BodyProps & { onEdit: (editing: Editing) => void },
): React.JSX.Element {
  return (
    <EntryList
      items={argumentItems(props.field.state.value, props.onEdit)}
      disabled={props.disabled}
      addLabel="Add argument"
      onAdd={() => props.onEdit(newArgument)}
    />
  );
}

const argumentItems = (
  values: readonly string[],
  onEdit: (editing: Editing) => void,
): EntryListItem[] =>
  keyedRows(values).map(({ key, index, value }) => ({
    key,
    label: value,
    onPress: () => onEdit({ index, value }),
  }));

function ArgumentRows(props: BodyProps): React.JSX.Element {
  const [editing, setEditing] = useState<Editing | null>(null);
  return (
    <>
      <ArgumentEntries {...props} onEdit={setEditing} />
      {editing && (
        <ArgumentSheet
          form={props.form}
          editing={editing}
          onEdit={setEditing}
        />
      )}
    </>
  );
}
