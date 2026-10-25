import { View, type ViewStyle } from 'react-native';
import { Text } from '#primitives/content/text';
import type { PieLegendRow } from './chart-data';

interface Props {
  rows: PieLegendRow[];
  colors: Record<string, string>;
}

const swatchSize = 8;

const swatchRadius = 2;

const legend = { justifyContent: 'center', paddingHorizontal: 8 } as const;

const row = { flexDirection: 'row', alignItems: 'center', gap: 6 } as const;

const swatch = (color: string): ViewStyle => ({
  width: swatchSize,
  height: swatchSize,
  borderRadius: swatchRadius,
  backgroundColor: color,
});

const name = { flexShrink: 1 } as const;

function LegendRow({ entry, color }: LegendRowProps): React.JSX.Element {
  return (
    <View style={row}>
      <View style={swatch(color)} />
      <Text role="secondary" numberOfLines={1} style={name}>
        {entry.name}
      </Text>
      <Text role="secondary" tone="muted">
        {entry.percent}
      </Text>
    </View>
  );
}

interface LegendRowProps {
  entry: PieLegendRow;
  color: string;
}

// Names and shares beside the slices; the image label and the hidden table already speak, so this is for the eye.
export function ChartLegend({ rows, colors }: Props): React.JSX.Element {
  return (
    <View accessible={false} aria-hidden style={legend}>
      {rows.map((entry) => (
        <LegendRow
          key={entry.key}
          entry={entry}
          color={colors[entry.key] ?? ''}
        />
      ))}
    </View>
  );
}
