import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { ListPlaceContext } from '#kit/list-place';
import { cn } from '#kit/utils';

/*
 * Paper's iOS sheet pads composed content 16 on every side; Android's drag handle zone already sets the top, so only
 * the top stays iOS's. The bottom is 16 on every platform: a popover or a web drawer ends on its last row otherwise.
 * A popover draws no title row above its first page, so that page takes the same 16 on top as on its sides.
 */
function sheetInsetClass(
  props: Pick<SheetInsetProps, 'inset' | 'top'>,
): string | undefined {
  if (!props.inset) return undefined;

  return props.top ? 'px-4 pb-4 pt-4' : 'px-4 pb-4 ios:pt-4';
}

interface SheetInsetProps {
  inset?: boolean;
  // Nothing sits above the content, so the inset pads its top too.
  top?: boolean;
  className?: string;
  children: ReactNode;
}

/*
 * The sheet's one inset around composed content. Inside it a FieldGroup or a List draws no inset of its own, so its
 * cards start on the edge a SegmentedControl or a Button beside them keeps, as an iOS sheet's do.
 */
export function SheetInset(props: SheetInsetProps): ReactElement {
  const view = (
    <View className={cn(sheetInsetClass(props), props.className)}>
      {props.children}
    </View>
  );

  if (!props.inset) return view;

  return <ListPlaceContext value="inset">{view}</ListPlaceContext>;
}
