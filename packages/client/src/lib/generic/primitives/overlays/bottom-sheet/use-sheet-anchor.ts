import {
  useCallback,
  useContext,
  useRef,
  type RefCallback,
  type RefObject,
} from 'react';
import type { View } from 'react-native';
import { useWide } from '../../../use-wide/use-wide';
import { BottomSheetAnchorContext } from './bottom-sheet-anchor-context';
import type { BottomSheetProps } from './bottom-sheet-props';

type AnchoredCard = {
  anchor: string | undefined;
  card: RefObject<View | null>;
  ref: RefCallback<View>;
};

export function useSheetAnchor(size: BottomSheetProps['size']): AnchoredCard {
  const card = useRef<View>(null);
  const name = useContext(BottomSheetAnchorContext);
  const anchor = useWide() && size === 'form' ? name : undefined;

  const ref = useCallback(
    (node: View | null) => {
      card.current = node;
      connectAnchor(node, anchor);
    },
    [anchor],
  );

  return { anchor, card, ref };
}

function connectAnchor(node: View | null, anchor: string | undefined): void {
  const dialog = sheetDialog(node);

  if (!dialog) return;

  if (anchor) dialog.style.setProperty('position-anchor', anchor);
  else dialog.style.removeProperty('position-anchor');
}

export function sheetDialog(node: View | null): HTMLElement | null {
  return node instanceof HTMLElement ? node.parentElement : null;
}
