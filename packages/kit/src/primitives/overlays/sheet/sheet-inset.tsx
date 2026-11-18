import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { ListPlaceContext } from '#kit/list-place';
import { cn } from '#kit/utils';

// Paper's iOS sheet pads composed content 16 on every side; Android's drag handle zone already sets the top.
function sheetInsetClass(inset: boolean | undefined): string {
  return cn(inset && 'px-4 ios:py-4');
}

interface SheetInsetProps {
  inset?: boolean;
  className?: string;
  children: ReactNode;
}

/*
 * The sheet's one inset around composed content. Inside it a FieldGroup or a List draws no inset of its own, so its
 * cards start on the edge a SegmentedControl or a Button beside them keeps, as an iOS sheet's do.
 */
export function SheetInset(props: SheetInsetProps): ReactElement {
  const view = (
    <View className={cn(sheetInsetClass(props.inset), props.className)}>
      {props.children}
    </View>
  );

  if (!props.inset) return view;

  return <ListPlaceContext value="inset">{view}</ListPlaceContext>;
}
