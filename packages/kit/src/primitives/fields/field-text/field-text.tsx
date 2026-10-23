import { Row } from '@expo/ui';
import type { ComponentProps, ReactElement } from 'react';
import { View } from 'react-native';
import { RowTitle } from '#primitives/fields/field-row';
import { TextInput } from '#primitives/inputs/text-input';
import type { FieldTextProps } from './field-text-props';

export type { FieldTextProps } from './field-text-props';

// The gap between the title and the input, as SwiftUI's form row keeps it.
const titleGap = 8;

// The bare input without its box: no border, fill, shadow or inset, at the row's own height.
const borderless =
  'h-auto flex-1 border-0 bg-transparent px-0 shadow-none sm:h-auto';

// The title's fixed column, iOS's 100pt (field-text.ios.tsx), so a section's inputs start in one column.
const titleColumn = 'w-25 shrink-0';

/*
 * iOS's form row (field-text.ios.tsx): the title on one line in a fixed column, then a borderless input, its text
 * leading-aligned. Expo UI's web TextInput draws a bordered, shadowed box, so the web uses the kit's bare input
 * without its box.
 */
export function FieldText(props: FieldTextProps): ReactElement {
  return (
    <Row alignment="center" spacing={titleGap}>
      <View className={titleColumn}>
        <RowTitle {...props} numberOfLines={1} />
      </View>
      <TextInput {...inputProps(props)} />
    </Row>
  );
}

const inputProps = (
  props: FieldTextProps,
): ComponentProps<typeof TextInput> => ({
  variant: 'bare',
  className: borderless,
  value: props.value,
  accessibilityLabel: props.title,
  placeholder: props.placeholder,
  editable: !props.disabled,
  secureTextEntry: props.secure,
  keyboardType: props.keyboardType,
  onChangeText: props.onChangeText,
  onBlur: props.onBlur,
  onSubmitEditing: () => props.onSubmit?.(),
});
