import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import type { ReactElement } from 'react';
import { View } from 'react-native';

// The Server cannot remove a Project yet, so the Button stays disabled.
export const removeSection = (): ReactElement => (
  <View className="gap-2">
    <Button
      label="Remove Project"
      variant="danger"
      disabled
      onPress={ignorePress}
      fullWidth
    />
    <Text role="secondary" tone="muted">
      Argo forgets this Project and archives its Sessions. The folder and its
      files stay.
    </Text>
  </View>
);

function ignorePress(): void {}
