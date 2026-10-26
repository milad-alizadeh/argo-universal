import type { ReactElement } from 'react';
import type { SelectionMode } from '#kit/selection-mode';
import { Button } from '#primitives/actions/button';
import type { ScreenProps } from './screen-props';

// While a List selects, its header replaces the Screen's, so the Actions and caption the Screen declared are not drawn.
export function selectionScreen(
  props: ScreenProps,
  mode: SelectionMode | null,
): ScreenProps {
  return mode?.header
    ? {
        ...props,
        actions: undefined,
        primaryAction: undefined,
        caption: undefined,
      }
    : props;
}

// The Select entry an iOS Screen's own heading draws, where a phone's stack header draws a stock bar button instead.
export function SelectEntry({
  mode,
}: {
  mode?: SelectionMode | null;
}): ReactElement | null {
  if (!mode?.begin) return null;

  return <Button label="Select" variant="text" onPress={mode.begin} />;
}
