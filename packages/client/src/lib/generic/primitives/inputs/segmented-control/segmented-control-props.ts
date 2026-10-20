export interface SegmentOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  label: string;
  options: readonly SegmentOption[];
  value: string;
  onValueChange: (value: string) => void;
}
