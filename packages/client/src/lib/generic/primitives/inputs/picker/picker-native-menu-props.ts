export type PickerMenuItem = { label: string; value: string };

export interface PickerMenuProps {
  selectedValue: string;
  onValueChange: (value: string) => void;
  enabled: boolean;
  items: PickerMenuItem[];
}
