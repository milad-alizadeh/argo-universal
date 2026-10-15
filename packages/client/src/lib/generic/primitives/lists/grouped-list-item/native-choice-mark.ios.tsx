import type * as React from 'react';
import { NativeSymbol } from '../../../symbols/native-symbol';

// The system checkmark a chosen row of a choice list carries, at the stock List's size, in the accent.
export function ChoiceMark(props: {
  visible: boolean;
}): React.JSX.Element | null {
  if (!props.visible) return null;

  return <NativeSymbol name="check" role="body" systemMark accent />;
}
