export interface SegmentedControlProps<Value extends string> {
  accessibilityLabel: string;
  value: Value;
  choices: readonly { value: Value; label: string }[];
  onValueChange: (value: Value) => void;
  disabled?: boolean;
}
