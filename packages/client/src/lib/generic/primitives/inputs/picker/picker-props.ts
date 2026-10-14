import type { ReactElement } from 'react';
import type { FieldErrors } from '#primitives/fields/field-errors';
import type { IconName } from '../../../symbols/icon-names';

// A step an option offers while it cannot be chosen, such as installing an Agent first.
export type PickerOptionAction = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
};

export type PickerOption<Value extends string> = {
  value: Value;
  label: string;
  disabled?: boolean;
  // A second line under the label, such as a Project's folder.
  supporting?: string;
  // The supporting line is code, such as a path, and draws in the mono face.
  supportingCode?: boolean;
  icon?: IconName;
  // Names the option for assistive technology when its label alone is too short.
  accessibilityLabel?: string;
  action?: PickerOptionAction;
};

export type PickerProps<Value extends string> = {
  label: string;
  required?: boolean;
  value?: Value;
  options: readonly PickerOption<Value>[];
  onValueChange: (value: Value) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Validation errors for the chosen value. */
  errors?: FieldErrors;
  hint?: string;
  loading?: boolean;
  /** Why the options failed to load; shown in place of the option list. */
  loadError?: string;
  /*
   * `row` is a drill row inside a menu or sheet: it shows the label and the chosen option, and opens
   * the options beside it on a wide window or as a page pushed in the same sheet on a phone.
   */
  variant?: 'row' | 'field';
  onBlur?: () => void;
};

// A row after the options, such as "Add a Project".
export type ComboboxFooterAction = {
  label: string;
  icon?: IconName;
  onPress: () => void;
};

// A Picker with search: its options open in a popover on a wide window and in a sheet on a phone.
export type ComboboxProps<Value extends string> = Omit<
  PickerProps<Value>,
  'variant'
> & {
  searchPlaceholder?: string;
  // Whether an option matches the query; by default its label or supporting line contains it.
  filter?: (option: PickerOption<Value>, query: string) => boolean;
  // Shown in place of the options when none matches the query.
  emptyLabel?: string;
  // Shown beside the spinner while the options load; by default "Loading…".
  loadingLabel?: string;
  footerAction?: ComboboxFooterAction;
  // The control that opens it, such as a toolbar Button; by default a button naming the chosen option.
  trigger?: ReactElement<{ disabled?: boolean | null }>;
};
