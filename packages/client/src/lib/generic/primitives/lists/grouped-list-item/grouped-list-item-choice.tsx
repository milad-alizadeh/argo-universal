import type * as React from 'react';
import { Platform, View } from 'react-native';
import { Icon } from '#primitives/display/icon';
import { SelectedCheck } from '#primitives/display/selected-check';
import { useOverlayList } from '#primitives/fields/field-layout';
import { RadioMark } from '#primitives/inputs/checkbox';
import type { ResolvedItemProps } from './grouped-list-item-props';

type Choice = Pick<
  ResolvedItemProps,
  'choice' | 'selected' | 'disabled' | 'accessory' | 'control'
>;

// Paper's popover rows: a 16 slot leads every choice, so the labels line up whichever row holds the check.
export function LeadingChoiceMark({
  selected,
}: Pick<ResolvedItemProps, 'selected'>): React.JSX.Element {
  return (
    <View className="w-4 shrink-0 items-center">
      {selected && <Icon name="check" role="control" aria-hidden />}
    </View>
  );
}

// A list row marks its choice at the end: the system check, or Material's radio button on an Android phone.
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

interface ChoicePlace {
  leading: boolean;
  item: ResolvedItemProps;
}

// A popover leads each choice with its check; a list marks it at the end.
export function useChoicePlace(props: ResolvedItemProps): ChoicePlace {
  const leading = useOverlayList() && !!props.choice;

  return { leading, item: leading ? props : trailingChoiceMark(props, false) };
}

export const isAndroid = Platform.OS === 'android';
