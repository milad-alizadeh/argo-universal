import type { ReactElement } from 'react';
import type { TextInputProps } from '#primitives/inputs/text-input';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import type { TextFieldsProps } from './elicitation-text-fields-props';

// A phone's field is a row of its own section: an inset field on iOS, a bare Material field on Android.
export const textFieldVariant = 'row' satisfies TextInputProps['variant'];

export function TextFields(props: TextFieldsProps): ReactElement {
  return <GroupedListSection textFields {...props} />;
}
