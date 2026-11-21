import type { ReactElement } from 'react';
import { View } from 'react-native';
import { RowTitle } from '#primitives/fields/field-row';
import { FieldTextInput } from './field-text-input';
import type { FieldTextProps } from './field-text-props';
import { fieldTextTone } from './field-text-tone';

export type { FieldTextProps } from './field-text-props';

// The title always sits above the input, at every width, so a long title is never cut short beside the value.
export function FieldText(props: FieldTextProps): ReactElement {
  return (
    <View className="w-full gap-2">
      {props.hideTitle ? null : <FieldTitle {...props} />}
      <FieldTextInput {...props} />
    </View>
  );
}

function FieldTitle(props: FieldTextProps): ReactElement {
  return (
    <View className="w-full">
      <RowTitle
        {...props}
        tone={fieldTextTone(props.error)}
        numberOfLines={0}
      />
    </View>
  );
}
