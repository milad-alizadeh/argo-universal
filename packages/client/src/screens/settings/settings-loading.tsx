import { Text } from '@repo/kit/primitives/content/text';
import { Spinner } from '@repo/kit/primitives/status/spinner';
import type { ReactElement } from 'react';
import { View } from 'react-native';

// What a Settings screen shows while the Server has not answered: a Spinner and what it waits for, in place of the FieldGroup.
export const SettingsLoading = ({ label }: { label: string }): ReactElement => (
  <View className="flex-row items-center gap-3 p-4">
    <Spinner accessibilityLabel="Loading" />
    <Text role="body" tone="muted">
      {label}
    </Text>
  </View>
);
