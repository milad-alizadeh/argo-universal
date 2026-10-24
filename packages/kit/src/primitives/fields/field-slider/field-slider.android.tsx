import { Slider } from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import type { FieldGroupKitProps } from '../../kit-props';
import { RowListItem } from '../field-row/field-row-list-item.android';
import { sliderProps, spokenValue } from './field-slider-props';

type Props = FieldGroupKitProps<'FieldGroup.Slider'>;

/*
 * A ListItem with the title as its headline, the value's words at its end and Expo UI's universal Slider under it,
 * in the section's card. TalkBack hears the name and the value together: Compose's stock semantics take only a
 * content description.
 */
export function FieldSlider(props: Props): ReactElement {
  return (
    <RowListItem
      title={props.title}
      disabled={props.disabled}
      trailing={<ValueWords {...props} />}
      supporting={<Slider {...sliderProps(props, [described(props)])} />}
    />
  );
}

const described = (props: Props): ReturnType<typeof semantics> =>
  semantics({ contentDescription: `${props.title}, ${spokenValue(props)}` });

function ValueWords(props: Props): ReactElement | null {
  if (!props.valueLabel) return null;

  return <NativeText tone="muted">{props.valueLabel}</NativeText>;
}
