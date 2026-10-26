// A modal that holds unsaved input sets `dismissible` to false: only its own actions close it.
export function mayDismiss(dismissible: boolean | undefined): boolean {
  return dismissible !== false;
}

interface Press {
  target: unknown;
  currentTarget: unknown;
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
