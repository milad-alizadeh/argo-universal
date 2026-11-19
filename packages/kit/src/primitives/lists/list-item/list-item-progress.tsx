import type { ReactNode } from 'react';
import { View } from 'react-native';
import {
  ProgressBar,
  type ProgressBarProps,
} from '#primitives/status/progress-bar';
import type { ListItemProps } from './list-item-props';

/*
 * Paper "SessionsList": a sidebar row's bar runs under its content, 4 above the row's end, on a hairline track.
 * A phone row's step bar runs under its content too, past the 24 leading slot and its
 * 16 gap, 8 above the row's end; a plain bar keeps the row's full width.
 */
const barPlaces = {
  sidebar: 'absolute bottom-1 left-9.5 right-3',
  steps: 'absolute bottom-2 left-14 right-4 wide:left-15 wide:right-5',
  full: 'absolute inset-x-0 bottom-0',
};

function barPlace(
  sidebar: boolean | undefined,
  steps: ProgressBarProps['steps'],
): string {
  if (sidebar) return barPlaces.sidebar;

  return steps ? barPlaces.steps : barPlaces.full;
}

export function ItemProgress({
  progress,
  sidebar,
}: Required<Pick<ListItemProps, 'progress'>> &
  Pick<ListItemProps, 'sidebar'>): ReactNode {
  return (
    <View className={barPlace(sidebar, progress.steps)}>
      <ProgressBar {...progress} track={sidebar ? 'hairline' : undefined} />
    </View>
  );
}
