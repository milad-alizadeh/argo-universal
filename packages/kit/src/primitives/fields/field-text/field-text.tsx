import { Row } from '@expo/ui';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { RowTitle } from '#primitives/fields/field-row';
import { FieldTextInput } from './field-text-input';
import type { FieldTextProps } from './field-text-props';
import { fieldTextTone } from './field-text-tone';

export type { FieldTextProps } from './field-text-props';

// The gap between the title and the input, as SwiftUI's form row keeps it.
const titleGap = 8;

// The title's fixed column, iOS's 100pt (field-text.ios.tsx), so a section's inputs start in one column.
const titleColumn = 'w-25 shrink-0';

/*
 * iOS's form row (field-text.ios.tsx): the title on one line in a fixed column, then a borderless input, its text
 * leading-aligned. Expo UI's web TextInput draws a bordered, shadowed box, so the web uses the kit's bare input
 * as a private piece (field-text-input.tsx).
 */
export function FieldText(props: FieldTextProps): ReactElement {
  return (
    <Row alignment="center" spacing={titleGap}>
      {props.hideTitle ? null : <FieldTitle {...props} />}
      <FieldTextInput {...props} />
    </Row>
  );
}

function FieldTitle(props: FieldTextProps): ReactElement {
  return (
    <View className={titleColumn}>
      <RowTitle
        {...props}
        tone={fieldTextTone(props.error)}
        numberOfLines={1}
      />
    </View>
  );
}
