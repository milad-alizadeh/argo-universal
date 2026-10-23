import { Slider } from '@expo/ui';
import type { ReactElement } from 'react';
import type { FieldGroupKitProps } from '../../kit-props';
/* oxlint-disable-next-line no-restricted-imports -- the Android-only drawing stays out of the folder's index so the web never loads Compose. */
import { RowListItem } from '../field-row/field-row-list-item.android';
import { sliderProps } from './field-slider-props';

// A ListItem with the title as its headline and Expo UI's universal Slider under it, in the section's card.
export function FieldSlider(
  props: FieldGroupKitProps<'FieldGroup.Slider'>,
): ReactElement {
  return (
    <RowListItem
      title={props.title}
      disabled={props.disabled}
      supporting={<Slider {...sliderProps(props)} />}
    />
  );
}
