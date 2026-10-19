// Android only: the checkbox dialog drawn by picker-multiple.android.tsx.
import {
  AlertDialog,
  Column,
  Text,
  TextButton,
} from '@expo/ui/jetpack-compose';
import { useState, type ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import { CheckboxBox } from '#primitives/inputs/checkbox';
import { Host } from '#primitives/native/host';
import { useMaterialPalette } from '#primitives/native/material-palette';
import { chooseValues, toggled } from './picker-multiple-value';
import type { MultiplePickerProps, PickerOption } from './picker-props';
import { pickerOptionsMessage } from './picker-selection';

type DialogProps<Value extends string> = MultiplePickerProps<Value> & {
  close: () => void;
};

type Draft = {
  draft: readonly string[];
  onDraftChange: (draft: readonly string[]) => void;
};

export function ChoicesDialog<Value extends string>(
  props: DialogProps<Value>,
): ReactElement {
  const [draft, setDraft] = useState<readonly string[]>(props.value ?? []);

  return (
    <Host matchContents>
      <AlertDialog
        colors={useMaterialPalette().dialogColors}
        onDismissRequest={props.close}
      >
        <DialogSlots {...props} draft={draft} onDraftChange={setDraft} />
      </AlertDialog>
    </Host>
  );
}

function DialogSlots<Value extends string>(
  props: DialogProps<Value> & Draft,
): ReactElement {
  return (
    <>
      <AlertDialog.Title>
        <Text style={{ typography: 'headlineSmall' }}>{props.label}</Text>
      </AlertDialog.Title>
      <AlertDialog.Text>
        <DialogChoices {...props} />
      </AlertDialog.Text>
      <DialogAnswers {...props} />
    </>
  );
}

function confirm<Value extends string>(
  props: DialogProps<Value> & Draft,
): void {
  chooseValues(props, props.draft);
  props.close();
}

// OK commits the draft; Cancel and dismissal leave the value as it was.
function DialogAnswers<Value extends string>(
  props: DialogProps<Value> & Draft,
): ReactElement {
  return (
    <>
      <AlertDialog.ConfirmButton>
        <Answer label="OK" onPress={() => confirm(props)} />
      </AlertDialog.ConfirmButton>
      <AlertDialog.DismissButton>
        <Answer label="Cancel" onPress={props.close} />
      </AlertDialog.DismissButton>
    </>
  );
}

type ChoicesProps<Value extends string> = MultiplePickerProps<Value> & Draft;

function DialogChoices<Value extends string>(
  props: ChoicesProps<Value>,
): ReactElement {
  const message = pickerOptionsMessage(props);

  if (message)
    return <Text style={{ typography: 'bodyMedium' }}>{message}</Text>;

  return (
    <Column>
      {props.options.map((option) => (
        <Choice key={option.value} {...props} option={option} />
      ))}
    </Column>
  );
}

function Choice<Value extends string>(
  props: ChoicesProps<Value> & { option: PickerOption<Value> },
): ReactElement {
  const { option, draft } = props;

  return (
    <CheckboxBox
      label={option.label}
      value={draft.includes(option.value)}
      disabled={option.disabled}
      onValueChange={(checked: boolean) =>
        props.onDraftChange(toggled(draft, option.value, checked))
      }
    />
  );
}

function Answer(props: { label: string; onPress: () => void }): ReactElement {
  return (
    <TextButton
      colors={useMaterialPalette().dialogAnswerColors}
      onClick={props.onPress}
    >
      <NativeText role="control">{props.label}</NativeText>
    </TextButton>
  );
}
