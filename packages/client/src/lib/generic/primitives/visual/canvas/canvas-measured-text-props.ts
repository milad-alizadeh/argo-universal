export interface TextMeasurement {
  width: number;
  height: number;
  singleLine: boolean;
}

export interface MeasuredTextProps {
  text: string;
  color?: string;
  visible: boolean;
  onMeasure: (measurement: TextMeasurement) => void;
}
