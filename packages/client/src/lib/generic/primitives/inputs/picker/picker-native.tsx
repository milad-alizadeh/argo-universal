import { createElement, useState } from 'react';
import { View } from 'react-native';
import { Host } from '../../native/host';
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
export type PickerHostSizing = Pick<
  React.ComponentProps<typeof Host>,
  'matchContents' | 'style'
>;

type NativeParts = {
  Control: Drawing;
  useHostSizing?: () => PickerHostSizing;
};

// A field Picker spans its form's width.
export const fieldHostSizing: PickerHostSizing = {
  matchContents: { vertical: true },
  style: { width: '100%' },
};
const useFieldHostSizing = (): PickerHostSizing => fieldHostSizing;

export function createNativePicker(parts: NativeParts): NativePicker {
  return function Picker<Value extends string>(
    props: PickerProps<Value>,
  ): React.JSX.Element {
    const field = usePickerField(props);
    return createElement(
      View,
      { className: 'gap-2' },
      <PickerHost {...props} invalid={field.invalid} parts={parts} />,
      <PickerFooter {...field} />,
    );
  };
}

function PickerHost<Value extends string>(
  props: PickerProps<Value> & { parts: NativeParts },
): React.JSX.Element {
  const { Control, useHostSizing = useFieldHostSizing } = props.parts;
  const presentation = usePresentation(props.onBlur);
  return (
    <Host {...useHostSizing()}>
      <Control {...props} {...presentation} />
    </Host>
  );
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
