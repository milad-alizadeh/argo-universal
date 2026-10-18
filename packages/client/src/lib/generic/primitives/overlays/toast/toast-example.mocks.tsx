import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { showToast, useErrorToast } from './toast';

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

export const archivedWithUndo = { title: 'Session archived', action: 'Undo' };

const showArchived = (onUndo: () => void): void =>
  showToast({
    tone: 'success',
    title: archivedWithUndo.title,
    action: { label: archivedWithUndo.action, onPress: onUndo },
  });

// A finished action whose toast offers to take it back, for Toast stories.
export function ActionToastExample({
  onUndo,
}: {
  onUndo: () => void;
}): React.JSX.Element {
  return (
    <View className="items-start">
      <Button
        label="Archive"
        variant="outline"
        onPress={() => showArchived(onUndo)}
      />
    </View>
  );
}
