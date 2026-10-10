import { Slider as NativeSlider } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  accessibilityValue,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Host } from './host';
import type { SliderProps } from './slider';
import { optionalTint } from './swift-tint';

export function Slider(props: SliderProps): React.JSX.Element {
  const modifiers = useSliderModifiers(props);
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <NativeSlider
        value={props.value ?? props.minimumValue}
        min={props.minimumValue}
        max={props.maximumValue}
        step={props.step}
        onValueChange={props.onValueChange}
        modifiers={modifiers}
      />
    </Host>
  );
}

function useSliderModifiers(
  props: Pick<SliderProps, 'accessibilityLabel' | 'valueLabel'>,
): React.ComponentProps<typeof NativeSlider>['modifiers'] {
  const { tint } = useNativeTheme().colors;
  return [
    accessibilityLabel(props.accessibilityLabel),
    accessibilityValue(props.valueLabel),
    ...optionalTint(tint),
  ];
}
