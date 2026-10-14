import type * as React from 'react';
import { View } from 'react-native';

export type FieldGroupContentProps = { children: React.ReactNode };

// Content in a FieldGroup outside any section's card, such as an alert or a form's actions.
export function FieldGroupContent({
  children,
}: FieldGroupContentProps): React.JSX.Element {
  return <View>{children}</View>;
}
