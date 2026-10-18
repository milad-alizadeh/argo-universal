import type * as React from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';

export const archivedBannerText = 'Archived · read-only';

// An archived Session's Feed stays readable; this takes the Composer's place. It has no button: Undo lives only in the archive toast.
export function ArchivedBanner(): React.JSX.Element {
  return (
    <View className="h-12 w-full flex-row items-center gap-2 rounded-2xl bg-muted px-4">
      <Icon name="archive" role="control" tone="muted" />
      <Text role="body" tone="muted">
        {archivedBannerText}
      </Text>
    </View>
  );
}
