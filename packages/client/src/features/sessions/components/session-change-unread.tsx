import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { type UnreadChange, unreadMessage } from './change-discovery';

export interface SessionChangeUnreadProps {
  // The attached pull requests that were never read; nothing draws when there are none.
  unread: readonly UnreadChange[];
  onRetry: () => void;
}

const named = (unread: readonly UnreadChange[]): string =>
  unread.map(({ repository, number }) => `${repository}#${number}`).join(', ');

// Provisional (the owner reviews it in Storybook): a notice that some attached pull requests could not be read, with Retry.
export function SessionChangeUnread({
  unread,
  onRetry,
}: SessionChangeUnreadProps): ReactElement | null {
  if (unread.length === 0) return null;

  return (
    <View className="gap-2 px-3 py-2" accessibilityRole="alert">
      <Text tone="warning">{unreadMessage(unread.length)}</Text>
      <Text role="secondary" tone="muted">
        {named(unread)}
      </Text>
      <Button size="sm" label="Retry" onPress={onRetry} />
    </View>
  );
}
