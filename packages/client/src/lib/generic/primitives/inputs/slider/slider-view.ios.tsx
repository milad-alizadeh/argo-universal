import { Slider as UniversalSlider } from '@expo/ui';
import {
  accessibilityLabel,
  accessibilityValue,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { ControlHost } from '../../native/native-control';
import { optionalTint } from '../../native/swift-tint';
import type { SliderProps } from './slider';

export function Slider(props: SliderProps): React.JSX.Element {
  const modifiers = useSliderModifiers(props);
  return (
    <ControlHost matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <UniversalSlider
        value={props.value ?? props.minimumValue}
        min={props.minimumValue}
        max={props.maximumValue}
        step={props.step}
        disabled={props.disabled}
        onValueChange={props.onValueChange}
        modifiers={modifiers}
      />
    </ControlHost>
  );
}

function useSliderModifiers(
  props: Pick<SliderProps, 'accessibilityLabel' | 'valueLabel'>,
): React.ComponentProps<typeof UniversalSlider>['modifiers'] {
  const { tint } = useNativeTheme().colors;
  return [
    accessibilityLabel(props.accessibilityLabel),
    accessibilityValue(props.valueLabel),
    ...optionalTint(tint),
  ];
}
