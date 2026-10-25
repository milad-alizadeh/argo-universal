import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  type LoadingLanes,
  SkeletonContent,
  SkeletonMark,
  type SkeletonRow,
} from './list-skeleton';

/*
 * Android's own rows centre their icon beside a two-line row's lines, where the row's leading lane holds it on the
 * title's; the mark joins the bars' lane so it stands where the loaded icon will.
 */
export function loadingLanes(row: SkeletonRow): LoadingLanes {
  return {
    content:
      row.leading === undefined ? (
        <SkeletonContent {...row} />
      ) : (
        <CentredMark row={row} />
      ),
  };
}

/*
 * The mark in a box the leading lane's size, as far from the bars as the lane is from the title. The bars' lines
 * stand 6 taller than Material's two-line row, 72, so the lane gives 3 back above and below.
 */
function CentredMark({ row }: { row: SkeletonRow }): ReactElement {
  return (
    <View className="-my-0.75 min-w-0 flex-1 flex-row items-center gap-4">
      <View className="size-6 items-center justify-center">
        <SkeletonMark />
      </View>
      <SkeletonContent {...row} />
    </View>
  );
}
