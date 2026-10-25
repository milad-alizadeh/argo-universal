import {
  AlertDialog,
  Checkbox,
  Column,
  RadioButton,
  Row,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import {
  clickable,
  fillMaxWidth,
  verticalScroll,
} from '@expo/ui/jetpack-compose/modifiers';
import { useState, type ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import { type FieldPickerOption, type PickerProps } from './field-picker-model';

type DialogProps = PickerProps & { onClose: () => void };

type Draft = {
  draft: readonly string[];
  onDraftChange: (draft: readonly string[]) => void;
};

/*
 * The dialog of Android's ListPreference: the row's title over a radio button per option, where choosing one
 * reports it and closes, and Cancel dismisses. With `multiple`, checkboxes edit a draft that OK reports and Cancel
 * drops, as MultiSelectListPreference does.
 */
export function FieldPickerDialog(props: DialogProps): ReactElement {
  const [draft, setDraft] = useState<readonly string[]>(props.held);

  return (
    <AlertDialog onDismissRequest={props.onClose}>
      <AlertDialog.Title>
        <Text style={{ typography: 'headlineSmall' }}>{props.title}</Text>
      </AlertDialog.Title>
      <AlertDialog.Text>
        <Choices {...props} draft={draft} onDraftChange={setDraft} />
      </AlertDialog.Text>
      <Answers {...props} draft={draft} />
    </AlertDialog>
  );
}

function Choices(props: DialogProps & Draft): ReactElement {
  return (
    <Column modifiers={[fillMaxWidth(), verticalScroll()]}>
      {props.options.map((option) => (
        <Choice key={option.value} {...props} option={option} />
      ))}
    </Column>
  );
}

type ChoiceProps = DialogProps & Draft & { option: FieldPickerOption };

function Choice(props: ChoiceProps): ReactElement {
  const press = (): void => pick(props);

  return (
    <Row
      verticalAlignment="center"
      horizontalArrangement={{ spacedBy: 8 }}
      modifiers={[fillMaxWidth(), clickable(press)]}
    >
      <Mark {...props} onPress={press} />
      <Text>{props.option.label}</Text>
    </Row>
  );
}

function Mark(props: ChoiceProps & { onPress: () => void }): ReactElement {
  const on = props.draft.includes(props.option.value);

  if (props.multiple)
    return <Checkbox value={on} onCheckedChange={props.onPress} />;

  return <RadioButton selected={on} onClick={props.onPress} />;
}

// One option reports and closes the dialog; a multiple dialog only edits its draft.
function pick(props: ChoiceProps): void {
  if (props.multiple) {
    props.onDraftChange(toggle(props.draft, props.option.value));

    return;
  }

  props.pick(props.option.value);
  props.onClose();
}

const toggle = (draft: readonly string[], value: string): readonly string[] =>
  draft.includes(value)
    ? draft.filter((held) => held !== value)
    : [...draft, value];

// OK, for a multiple choice, reports the draft in the options' order; Cancel and dismissal leave the value.
function Answers(props: DialogProps & Pick<Draft, 'draft'>): ReactElement {
  return (
    <>
      <Confirm {...props} />
      <AlertDialog.DismissButton>
        <Answer label="Cancel" onClick={props.onClose} />
      </AlertDialog.DismissButton>
    </>
  );
}

function Confirm(
  props: DialogProps & Pick<Draft, 'draft'>,
): ReactElement | null {
  if (!props.multiple) return null;

  return (
    <AlertDialog.ConfirmButton>
      <Answer label="OK" onClick={() => confirm(props)} />
    </AlertDialog.ConfirmButton>
  );
}

function confirm(props: DialogProps & Pick<Draft, 'draft'>): void {
  props.onValueChange(
    props.options
      .map((option) => option.value)
      .filter((value) => props.draft.includes(value)),
  );
  props.onClose();
}

function Answer(props: { label: string; onClick: () => void }): ReactElement {
  return (
    <TextButton onClick={props.onClick}>
      <NativeText role="control">{props.label}</NativeText>
    </TextButton>
  );
}
