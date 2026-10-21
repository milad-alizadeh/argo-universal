import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ProgressBar } from '#primitives/status/progress-bar';
import type { ListItemProps } from './list-item-props';

// Paper "SessionsList": a sidebar row's bar runs under its content, 4 above the row's end, on a hairline track.
export function ItemProgress({
  progress,
  sidebar,
}: Pick<ListItemProps, 'progress' | 'sidebar'>): ReactNode {
  if (!progress) return null;

  return sidebar ? (
    <View className="absolute bottom-1 left-9.5 right-3">
      <ProgressBar {...progress} track="hairline" />
    </View>
  ) : (
    <View className="absolute inset-x-0 bottom-0">
      <ProgressBar {...progress} />
    </View>
  );
}
