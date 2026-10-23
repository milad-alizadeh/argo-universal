import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { NativeText } from '#primitives/content/native-text';
import { RowTitle } from '#primitives/fields/field-row';
import { SelectedCheck } from '#primitives/status/selected-check';
import {
  optionChoice,
  type OptionRowProps,
} from './field-picker-inline-choice';

/*
 * One option as a row of its own: the title (and icon), the subtitle under it, and the check at the end once chosen.
 * The Section frames each row and draws the separators between them.
 */
export function OptionRow(props: OptionRowProps): ReactElement {
  const { selected, toggle } = optionChoice(props);

  return (
    <Pressable {...pressProps(props, selected, toggle)}>
      <Text {...props} />
      <View className="size-4 items-center justify-center">
        {selected ? <SelectedCheck /> : null}
      </View>
    </Pressable>
  );
}

const pressProps = (
  props: OptionRowProps,
  selected: boolean,
  onPress: () => void,
): React.ComponentProps<typeof Pressable> => ({
  role: props.multiple ? 'checkbox' : 'radio',
  'aria-checked': selected,
  'aria-disabled': props.disabled,
  disabled: props.disabled,
  onPress,
  className: 'flex-row items-center gap-3',
});

function Text({ option }: OptionRowProps): ReactElement {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <RowTitle title={option.label} leading={option.icon} />
      {option.subtitle ? (
        <NativeText role="secondary" tone="muted">
          {option.subtitle}
        </NativeText>
      ) : null}
    </View>
  );
}
