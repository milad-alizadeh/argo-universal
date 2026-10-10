import { Host, Slider as NativeSlider } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useResolveClassNames } from 'uniwind';
import type { SliderProps } from './slider';

// The Material slider; it snaps to each step.
export function Slider({
  value,
  minimumValue,
  maximumValue,
  step,
  onValueChange,
}: SliderProps): React.JSX.Element {
  const primary = useResolveClassNames('text-primary').color;
  const muted = useResolveClassNames('text-muted').color;
  const primaryColor = typeof primary === 'string' ? primary : undefined;
  const mutedColor = typeof muted === 'string' ? muted : undefined;
  // Compose counts only the stops between the two ends.
  const stops = Math.round((maximumValue - minimumValue) / step) - 1;
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <NativeSlider
        value={value ?? minimumValue}
        min={minimumValue}
        max={maximumValue}
        steps={Math.max(0, stops)}
        onValueChange={onValueChange}
        colors={{
          thumbColor: primaryColor,
          activeTrackColor: primaryColor,
          inactiveTrackColor: mutedColor,
          activeTickColor: mutedColor,
          inactiveTickColor: primaryColor,
        }}
      />
    </Host>
  );
}
