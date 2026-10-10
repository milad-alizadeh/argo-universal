import { Host, Slider as NativeSlider } from '@expo/ui/swift-ui';
import {
  accessibilityLabel as accessibilityLabelModifier,
  accessibilityValue,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useResolveClassNames } from 'uniwind';
import type { SliderProps } from './slider';

// The system slider; it snaps to each step.
export function Slider({
  valueLabel,
  accessibilityLabel,
  value,
  minimumValue,
  maximumValue,
  step,
  onValueChange,
}: SliderProps): React.JSX.Element {
  const primary = useResolveClassNames('text-primary').color;
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <NativeSlider
        value={value ?? minimumValue}
        min={minimumValue}
        max={maximumValue}
        step={step}
        onValueChange={onValueChange}
        modifiers={[
          accessibilityLabelModifier(accessibilityLabel),
          accessibilityValue(valueLabel),
          ...(typeof primary === 'string' ? [tint(primary)] : []),
        ]}
      />
    </Host>
  );
}
