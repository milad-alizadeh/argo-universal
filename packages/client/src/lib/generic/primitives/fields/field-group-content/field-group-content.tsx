import type * as React from 'react';
import { View } from 'react-native';
import type { FieldGroupContentProps } from './field-group-content-props';

// Content in a FieldGroup outside any section's card, such as an alert or a form's actions.
export function FieldGroupContent({
  children,
}: FieldGroupContentProps): React.JSX.Element {
  return <View>{children}</View>;
}

FieldGroupContent satisfies React.ComponentType<FieldGroupContentProps>;
