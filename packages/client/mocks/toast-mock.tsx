import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '../src/lib/generic/primitives/buttons/button/button';
import { useErrorToast } from '../src/lib/generic/primitives/overlays/toast/toast';

export const failedOpen = {
  title: 'Could not open the Project',
  message: 'The folder was moved or deleted.',
};

function FailedOpen(): null {
  useErrorToast(failedOpen);
  return null;
}

// A failure that toasts as it starts, and a button that starts it again, for Toast stories.
export function ErrorToastExample(): React.JSX.Element {
  const [attempt, setAttempt] = useState(0);
  return (
    <View className="items-start">
      <FailedOpen key={attempt} />
      <Button
        label="Fail again"
        variant="outline"
        onPress={() => setAttempt((count) => count + 1)}
      />
    </View>
  );
}
