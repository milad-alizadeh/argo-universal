export interface SliderProps {
  value?: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  onValueChange: (value: number) => void;
  accessibilityLabel: string;
  valueLabel: string;
  disabled?: boolean;
}
