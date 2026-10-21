import type { TextLayoutEvent } from 'react-native';
import { Text } from '#primitives/content/text';
import type {
  MeasuredTextProps,
  TextMeasurement,
} from './canvas-measured-text-props';

function measured(event: TextLayoutEvent): TextMeasurement {
  const lines = event.nativeEvent.lines;
  const height = lines.reduce((total, line) => total + line.height, 0);

  return {
    width: Math.max(0, ...lines.map((line) => line.width)),
    height,
    singleLine: lines.length === 1,
  };
}

export function MeasuredText(props: MeasuredTextProps): React.JSX.Element {
  return (
    <Text
      role="body"
      accessible={false}
      style={{ color: props.color, opacity: props.visible ? 1 : 0 }}
      onTextLayout={(event) => props.onMeasure(measured(event))}
    >
      {props.text}
    </Text>
  );
}
