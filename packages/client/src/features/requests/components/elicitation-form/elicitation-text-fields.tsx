import type { ReactElement } from 'react';
import { View } from 'react-native';
import type { TextInputProps } from '#primitives/inputs/text-input';
import type { TextFieldsProps } from './elicitation-text-fields-props';

// On the web a field stands on its own, its label above it and its hint or error under it.
export const textFieldVariant =
  'standalone' satisfies TextInputProps['variant'];

// The fields sit in the list as they are, outside any rows' card.
export function TextFields({ children }: TextFieldsProps): ReactElement {
  return <View className="gap-3">{children}</View>;
}
