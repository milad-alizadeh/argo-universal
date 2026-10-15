export interface ComboboxSearchProps {
  // Names the field, such as "Find a Project".
  label: string;
  // Shows while the field is empty, such as "Find a Project…".
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  className?: string;
}
