import {
  type ModifierConfig,
  type PresentationDetent,
  presentationDetents,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import type { BottomSheetProps } from './bottom-sheet-props';

// A fitted sheet takes its height from the content, so only a fixed one names detents.
export function useSheetDetents(
  props: Pick<BottomSheetProps, 'fit' | 'initialSize'>,
  listHeight: number | undefined,
): ModifierConfig[] {
  const [selection, setSelection] = useState<PresentationDetent>(
    initialDetent(props.initialSize),
  );

  if (props.fit) return [];

  return [
    presentationDetents(...detentsFor(listHeight, selection, setSelection)),
  ];
}

const compactDetent = { height: 320 };

// A sheet sized to its list rises to the list's height, or to large when dragged there.
function detentsFor(
  listHeight: number | undefined,
  selection: PresentationDetent,
  onSelectionChange: (detent: PresentationDetent) => void,
): Parameters<typeof presentationDetents> {
  if (listHeight === undefined)
    return [
      [compactDetent, 'medium', 'large'],
      { selection, onSelectionChange },
    ];
  const fitted = { height: listHeight };
  const chosen = selection === 'large' ? 'large' : fitted;

  return [[fitted, 'large'], { selection: chosen, onSelectionChange }];
}

function initialDetent(
  size: BottomSheetProps['initialSize'],
): PresentationDetent {
  if (size === 'expanded') return 'large';

  return size === 'medium' ? 'medium' : compactDetent;
}
