// Material's multi-choice dialog: checkbox rows, and the choice commits on OK.
import { createElement, useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { ComboboxTrigger } from '#primitives/inputs/combobox';
import { ChoicesDialog } from './picker-multiple-dialog';
import { pickerSummary } from './picker-multiple-value';
import type { MultiplePickerProps } from './picker-props';

type Dialog = { open: boolean; show: () => void; close: () => void };

function useDialog(disabled?: boolean, onBlur?: () => void): Dialog {
  const [open, setOpen] = useState(false);

  const close = (): void => {
    setOpen(false);
    onBlur?.();
  };

  return { open, show: () => setOpen(!disabled), close };
}

export function MultiplePicker<Value extends string>(
  props: MultiplePickerProps<Value>,
): ReactElement {
  const dialog = useDialog(props.disabled, props.onBlur);

  return createElement(
    View,
    { className: 'gap-2' },
    <Trigger {...props} onPress={dialog.show} />,
    dialog.open ? <ChoicesDialog {...props} close={dialog.close} /> : null,
  );
}

function Trigger<Value extends string>(
  props: MultiplePickerProps<Value> & { onPress: () => void },
): ReactElement {
  return <ComboboxTrigger {...props} valueLabel={pickerSummary(props)} />;
}
