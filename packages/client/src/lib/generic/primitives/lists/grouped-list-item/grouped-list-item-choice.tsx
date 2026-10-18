import { Platform } from 'react-native';
import { RadioMark } from '#primitives/inputs/checkbox';
import { SelectedCheck } from '#primitives/status/selected-check';
import type { ResolvedItemProps } from './grouped-list-item-props';

type Choice = Pick<
  ResolvedItemProps,
  'choice' | 'selected' | 'disabled' | 'accessory' | 'control'
>;

// A choice is marked at the row's end: the system check, or Material's radio button on an Android phone.
export function trailingChoiceMark<Props extends Choice>(
  props: Props,
  android: boolean,
): Props {
  if (!props.choice) return props;

  return android ? withRadio(props) : withCheck(props);
}

function withRadio<Props extends Choice>(props: Props): Props {
  return {
    ...props,
    control: (
      <RadioMark selected={!!props.selected} disabled={props.disabled} />
    ),
  };
}

function withCheck<Props extends Choice>(props: Props): Props {
  return {
    ...props,
    accessory: props.selected ? <SelectedCheck /> : undefined,
  };
}

export const isAndroid = Platform.OS === 'android';
