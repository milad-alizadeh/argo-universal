import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';

export const archivedBannerText = 'Archived · read-only';

// An archived Session's Feed stays readable; this takes the Composer's place. It has no button: Undo lives only in the archive toast.
export function ArchivedBanner(): React.JSX.Element {
  return (
    <View className="h-12 w-full flex-row items-center gap-2 rounded-2xl bg-muted px-4">
      <Icon name="archive" size="sm" tone="muted" />
      <Text role="body" tone="muted">
        {archivedBannerText}
      </Text>
    </View>
  );
}
