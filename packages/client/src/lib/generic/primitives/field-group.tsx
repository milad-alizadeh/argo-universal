import type * as React from 'react';
import { View } from 'react-native';

// Web keeps the existing menu layout; native sections use Expo UI.
function Group({
  children,
}: React.ComponentProps<typeof View>): React.JSX.Element {
  return <View>{children}</View>;
}

const FieldGroup = Object.assign(Group, { Section: View });

export { FieldGroup };
