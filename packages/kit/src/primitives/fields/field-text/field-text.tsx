import type { ReactElement } from 'react';
import { View } from 'react-native';
import { RowTitle, useFieldLabelAbove } from '#primitives/fields/field-row';
import { FieldTextInput } from './field-text-input';
import type { FieldTextProps } from './field-text-props';
import { fieldTextTone } from './field-text-tone';

export type { FieldTextProps } from './field-text-props';

// The title's fixed column, iOS's 100pt (field-text.ios.tsx), so a section's inputs start in one column.
const titleColumn = 'w-25 shrink-0';

// Desktop modal and Elicitation labels wrap above the input; other fields keep their inline form row.
export function FieldText(props: FieldTextProps): ReactElement {
  const above = useFieldLabelAbove();

  return (
    <View className={above ? 'w-full gap-2' : 'flex-row items-center gap-2'}>
      {props.hideTitle ? null : <FieldTitle {...props} above={above} />}
      <FieldTextInput {...props} />
    </View>
  );
}

function FieldTitle(props: FieldTextProps & { above: boolean }): ReactElement {
  return (
    <View className={props.above ? 'w-full' : titleColumn}>
      <RowTitle
        {...props}
        tone={fieldTextTone(props.error)}
        numberOfLines={props.above ? 0 : 1}
      />
    </View>
  );
}
