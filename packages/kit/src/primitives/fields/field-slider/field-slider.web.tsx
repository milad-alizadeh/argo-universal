import { Column } from '@expo/ui';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Slider } from '#primitives/controls/slider';
import type { FieldGroupKitProps } from '../../kit-props';
import { SliderHeader } from './field-slider-header';
import { spokenValue } from './field-slider-props';

type Props = FieldGroupKitProps<'FieldGroup.Slider'>;

/*
 * The title and the value's words over the kit's range input. Expo UI's web Slider paints its own palette and takes no
 * accessibility props, so the web keeps the input that is named by the title and announces the value's words.
 */
export function FieldSlider(props: Props): ReactElement {
  return (
    <Column>
      <SliderHeader {...props} />
      <View className="self-stretch">
        <Range {...props} />
      </View>
    </Column>
  );
}

function Range(props: Props): ReactElement {
  return (
    <Slider
      accessibilityLabel={props.title}
      valueLabel={spokenValue(props)}
      value={props.value}
      minimumValue={props.min}
      maximumValue={props.max}
      step={props.step ?? 1}
      disabled={props.disabled}
      onValueChange={props.onValueChange}
    />
  );
}
