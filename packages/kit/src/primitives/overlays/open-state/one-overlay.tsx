import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { OpenState } from './open-state';

// A popover or menu that can be open: what closes it, and the overlay whose content it opens from.
interface Overlay {
  close: () => void;
  parent: Overlay | undefined;
}

// The popovers and menus open in this window now.
const openOverlays = new Set<Overlay>();

// The overlay a part belongs to.
const OwnOverlay = createContext<Overlay | undefined>(undefined);

// The overlay whose content a part is drawn in; an overlay opened from there belongs with it.
const EnclosingOverlay = createContext<Overlay | undefined>(undefined);

const opensInside = (overlay: Overlay, other: Overlay): boolean =>
  overlay.parent !== undefined &&
  (overlay.parent === other || opensInside(overlay.parent, other));

// A drill beside its menu, or a picker in a popover, stays open with the overlay it opened from.
const belongTogether = (overlay: Overlay, other: Overlay): boolean =>
  overlay === other ||
  opensInside(overlay, other) ||
  opensInside(other, overlay);

function closeTheRest(overlay: Overlay): void {
  const rest = [...openOverlays].filter(
    (other) => !belongTogether(overlay, other),
  );

  for (const other of rest) other.close();
}

// The overlay keeps one identity while what closes it follows the latest render.
function useOverlay(onOpenChange: OpenState['onOpenChange']): Overlay {
  const parent = useContext(EnclosingOverlay);
  const change = useRef(onOpenChange);

  useEffect(() => {
    change.current = onOpenChange;
  });

  const [overlay] = useState<Overlay>(() => ({
    parent,
    close: (): void => change.current(false),
  }));

  return overlay;
}

type OneOverlayProps = OpenState & {
  // Opens beside whatever is open and closes nothing, as a tooltip does.
  beside?: boolean;
  children: ReactNode;
};

/*
 * One popover or menu is open at a time (owner, 2026-11-18): opening one closes every other that it was not opened
 * from. Each overlay keeps its own open state, and a press React Native Web's pressables keep never reaches another
 * overlay as a press outside it, so two unrelated ones could stand open side by side.
 */
export function OneOverlay({
  beside = false,
  children,
  ...state
}: OneOverlayProps): ReactElement {
  const overlay = useOverlay(state.onOpenChange);

  useOpening(overlay, state.open && !beside);

  return <OwnOverlay value={overlay}>{children}</OwnOverlay>;
}

// Before the paint, so the two are never drawn open together.
function useOpening(overlay: Overlay, open: boolean): void {
  useLayoutEffect(() => {
    if (!open) return;

    closeTheRest(overlay);
    openOverlays.add(overlay);

    return (): void => {
      openOverlays.delete(overlay);
    };
  }, [open, overlay]);
}

// Wraps an overlay's content, so an overlay opened from inside it is told apart from one opened beside it.
export function OverlayContent(props: { children: ReactNode }): ReactElement {
  return (
    <EnclosingOverlay value={useContext(OwnOverlay)}>
      {props.children}
    </EnclosingOverlay>
  );
}
