import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { useSpacing } from '#lib/generic/use-spacing';
import { Pill } from '#primitives/status/pill';
import type { MetadataPillsProps } from './metadata-pills';

// Measure the actual Pills so font scaling, label changes and available width all refit the line.
export function MetadataPillLine({ pills }: MetadataPillsProps): ReactElement {
  const [available, setAvailable] = useState(0);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const gap = useSpacing('--spacing-1');
  const count = visibleCount(pills, widths, available, gap);
  const hidden = pills.length - count;
  function measure(key: string, width: number): void {
    setWidths((current) =>
      current[key] === width ? current : { ...current, [key]: width },
    );
  }

  return (
    <View
      className="min-w-0 flex-1"
      onLayout={(event) => setAvailable(event.nativeEvent.layout.width)}
    >
      <View
        testID="metadata-visible-pills"
        className="flex-row items-center gap-1 overflow-hidden"
      >
        {pills.slice(0, count).map((pill, index) => (
          <Pill key={index} {...pill} />
        ))}
        {hidden > 0 ? <Pill text={`+${hidden}`} /> : null}
      </View>
      <View
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        className="absolute left-0 top-0 flex-row opacity-0"
      >
        {pills.map((pill, index) => (
          <View
            key={index}
            onLayout={(event) =>
              measure(JSON.stringify(pill), event.nativeEvent.layout.width)
            }
          >
            <Pill {...pill} />
          </View>
        ))}
        {pills.map((_, index) => (
          <View
            key={`count-${index}`}
            onLayout={(event) =>
              measure(`+${index + 1}`, event.nativeEvent.layout.width)
            }
          >
            <Pill text={`+${index + 1}`} />
          </View>
        ))}
      </View>
    </View>
  );
}

function visibleCount(
  pills: MetadataPillsProps['pills'],
  widths: Record<string, number>,
  available: number,
  gap: number,
): number {
  if (pills.some((pill) => widths[JSON.stringify(pill)] === undefined))
    return pills.length;

  const total =
    pills.reduce((sum, pill) => sum + (widths[JSON.stringify(pill)] ?? 0), 0) +
    Math.max(0, pills.length - 1) * gap;
  if (total <= available) return pills.length;

  let used = 0;
  for (let index = 0; index < pills.length; index++) {
    const width = widths[JSON.stringify(pills[index])] ?? 0;
    const hidden = pills.length - index - 1;
    const extra = hidden > 0 ? (widths[`+${hidden}`] ?? Infinity) + gap : 0;
    if (used + width + extra > available) return index;
    used += width + gap;
  }
  return pills.length;
}
