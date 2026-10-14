import { createElement, useState } from 'react';
import { View } from 'react-native';
import { useInListItem } from '../../lists/list-item/list-item-accessory';
import { Host, type HostProps } from '../../native/host';
import { PickerFooter, usePickerField } from './picker-field';
import type { PickerProps } from './picker-props';

export type PickerPresentation = {
  open: boolean;
  onPress: () => void;
  onClose: () => void;
};

type Drawing = <Value extends string>(
  props: PickerProps<Value> & PickerPresentation,
) => React.JSX.Element;

type NativePicker = <Value extends string>(
  props: PickerProps<Value>,
) => React.JSX.Element;

export function createNativePicker(Control: Drawing): NativePicker {
  return function Picker<Value extends string>(
    props: PickerProps<Value>,
  ): React.JSX.Element {
    const field = usePickerField(props);

    return createElement(
      View,
      { className: 'gap-2' },
      <PickerHost {...props} invalid={field.invalid} Control={Control} />,
      <PickerFooter {...field} />,
    );
  };
}

function PickerHost<Value extends string>(
  props: PickerProps<Value> & { Control: Drawing },
): React.JSX.Element {
  const { Control } = props;
  const presentation = usePresentation(props.onBlur);

  return (
    <Host {...useHostSize()}>
      <Control {...props} {...presentation} />
    </Host>
  );
}

// A row's trailing slot has no width to fill, so there the Picker takes its own; elsewhere it spans the field.
function useHostSize(): Pick<HostProps, 'matchContents' | 'style'> {
  if (useInListItem()) return { matchContents: true };

  return { matchContents: { vertical: true }, style: { width: '100%' } };
}

function usePresentation(onBlur?: () => void): PickerPresentation {
  const [open, setOpen] = useState(false);

  return {
    open,
    onPress: (): void => setOpen(true),
    onClose: (): void => {
      setOpen(false);
      onBlur?.();
    },
  };
}
