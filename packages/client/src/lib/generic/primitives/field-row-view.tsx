import type * as React from 'react';
import { View } from 'react-native';

export type FieldRowProps = { children: React.ReactNode };

// Content in a FieldGroup outside any section's card, such as an alert or a form's actions.
export function FieldRow({ children }: FieldRowProps): React.JSX.Element {
  return <View>{children}</View>;
}
