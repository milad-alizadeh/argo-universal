import type { ReactElement } from 'react';
import type { PickerProps } from '#primitives/inputs/picker';
import type { IconName } from '../../../symbols/icon-names';

export interface ComboboxOption<Value extends string> {
  value: Value;
  label: string;
  accessibilityLabel?: string;
  supporting?: string;
  code?: boolean;
  icon?: IconName;
  disabled?: boolean;
}

export type ComboboxProps<Value extends string> = Omit<
  PickerProps<Value>,
  'options'
> & {
  options: readonly ComboboxOption<Value>[];
  title?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  filter?: (option: ComboboxOption<Value>, query: string) => boolean;
  footerAction?: { label: string; onPress: () => void };
  trigger?: ReactElement<{ disabled?: boolean; onPress?: () => void }>;
};

export type ComboboxContentProps<Value extends string> =
  ComboboxProps<Value> & {
    onClose?: () => void;
  };
