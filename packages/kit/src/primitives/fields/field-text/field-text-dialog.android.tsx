import {
  AlertDialog,
  Text,
  TextButton,
  TextField,
  type TextFieldKeyboardType,
  type TextFieldProps,
  useNativeState,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import type { FieldTextProps } from './field-text-props';

type FieldTextDialogProps = FieldTextProps & { onClose: () => void };

/*
 * The dialog of Android's EditTextPreference: the row's title, a text field holding a draft of the value, and Cancel
 * and OK. OK saves the draft; Cancel or a tap outside drops it.
 */
export function FieldTextDialog(props: FieldTextDialogProps): ReactElement {
  const draft = useNativeState(props.value);
  const save = (): void => saveDraft(props, draft.get());

  return (
    <AlertDialog onDismissRequest={() => close(props)}>
      <DialogTitle title={props.title} />
      <AlertDialog.Text>
        <DraftField {...props} draft={draft} onDone={save} />
      </AlertDialog.Text>
      <DialogButtons onSave={save} onCancel={() => close(props)} />
    </AlertDialog>
  );
}

function saveDraft(props: FieldTextDialogProps, text: string): void {
  props.onChangeText(text);
  props.onSubmit?.();
  close(props);
}

const close = (props: FieldTextDialogProps): void => {
  props.onBlur?.();
  props.onClose();
};

function DialogTitle(props: { title: string }): ReactElement {
  return (
    <AlertDialog.Title>
      <Text style={{ typography: 'headlineSmall' }}>{props.title}</Text>
    </AlertDialog.Title>
  );
}

function DialogButtons(props: {
  onSave: () => void;
  onCancel: () => void;
}): ReactElement {
  return (
    <>
      <AlertDialog.ConfirmButton>
        <DialogButton label="OK" onClick={props.onSave} />
      </AlertDialog.ConfirmButton>
      <AlertDialog.DismissButton>
        <DialogButton label="Cancel" onClick={props.onCancel} />
      </AlertDialog.DismissButton>
    </>
  );
}

function DialogButton(props: {
  label: string;
  onClick: () => void;
}): ReactElement {
  return (
    <TextButton onClick={props.onClick}>
      <NativeText role="control">{props.label}</NativeText>
    </TextButton>
  );
}

type DraftFieldProps = FieldTextProps & {
  draft: ReturnType<typeof useNativeState<string>>;
  onDone: () => void;
};

/*
 * Material's filled TextField, its placeholder showing while empty. It takes focus as the dialog opens, raising the
 * keyboard, as EditTextPreference's dialog does.
 */
function DraftField(props: DraftFieldProps): ReactElement {
  const selection = useOpeningSelection(props);

  return (
    <TextField
      {...draftEntry(props)}
      selection={selection}
      /* oxlint-disable-next-line jsx-a11y/no-autofocus -- the dialog exists to edit this one field; Android focuses it on open. */
      autoFocus
      modifiers={[fillMaxWidth()]}
    >
      <Placeholder text={props.placeholder} />
    </TextField>
  );
}

/*
 * `selectTextOnFocus`: the dialog's field opens with the whole value selected, so typing replaces it. The range is the
 * field's initial `selection` state, not `ref.setSelection`: calling that as the dialog mounts is rejected with "No
 * handler registered for AsyncFunction 'setSelection'", because the field has not bound it yet (#1775).
 */
function useOpeningSelection(
  props: DraftFieldProps,
): ReturnType<typeof useNativeState<{ start: number; end: number }>> {
  const end = props.selectTextOnFocus ? props.value.length : 0;

  return useNativeState({ start: 0, end });
}

const draftEntry = (props: DraftFieldProps): TextFieldProps => ({
  value: props.draft,
  singleLine: !props.multiline,
  isError: props.error !== undefined,
  visualTransformation: props.secure ? 'password' : 'none',
  keyboardOptions: {
    keyboardType: composeKeyboard(props),
    autoCorrectEnabled: props.secure ? false : undefined,
  },
  keyboardActions: { onDone: props.onDone },
});

function Placeholder(props: { text: string | undefined }): ReactElement | null {
  if (!props.text) return null;

  return (
    <TextField.Placeholder>
      <NativeText tone="muted">{props.text}</NativeText>
    </TextField.Placeholder>
  );
}

const keyboards: Partial<
  Record<NonNullable<FieldTextProps['keyboardType']>, TextFieldKeyboardType>
> = {
  'number-pad': 'number',
  numeric: 'number',
  'decimal-pad': 'decimal',
  'email-address': 'email',
  'phone-pad': 'phone',
  url: 'uri',
};

const typedKeyboard = (
  type: FieldTextProps['keyboardType'],
): TextFieldKeyboardType => keyboards[type ?? 'default'] ?? 'text';

const composeKeyboard = (props: FieldTextProps): TextFieldKeyboardType =>
  props.secure ? 'password' : typedKeyboard(props.keyboardType);
