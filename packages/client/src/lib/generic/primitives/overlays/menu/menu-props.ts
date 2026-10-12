import type { ReactElement } from 'react';

export interface MenuProps<Value extends string> {
  accessibilityLabel: string;
  value: Value;
  choices: readonly { value: Value; label: string }[];
  onValueChange: (value: Value) => void;
  trigger: ReactElement;
  disabled?: boolean;
}
