// A modal that holds unsaved input sets `dismissible` to false: only its own actions close it.
export function mayDismiss(dismissible: boolean | undefined): boolean {
  return dismissible !== false;
}

interface Pointed {
  target: unknown;
  currentTarget: unknown;
}

/*
 * A press counts from where it began. A menu that opens on pointer down takes the pointer from the card under it, and
 * a drag out of a field leaves the card, so either press ends on the scrim though it began inside the card.
 */
export function beginsOnBackdrop(pointer: Pointed): boolean {
  return pointer.target === pointer.currentTarget;
}

interface Press extends Pointed {
  isDefaultPrevented: () => boolean;
}

// A press inside the card bubbles up to the backdrop, so only a press on the bare backdrop counts.
export function dismissesOnBackdropPress(
  press: Press,
  dismissible: boolean | undefined,
): boolean {
  return (
    mayDismiss(dismissible) &&
    press.target === press.currentTarget &&
    !press.isDefaultPrevented()
  );
}
