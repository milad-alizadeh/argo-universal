/*
 * Compose reports a field's focus once when it first draws, unfocused. Only leaving
 * a field the person entered is a blur, so the form marks it touched no earlier.
 */
export function blurOnFocusLoss(
  onBlur: () => void = () => {},
): (focused: boolean) => void {
  let entered = false;

  return (focused) => {
    const left = entered && !focused;
    entered = focused;

    if (left) onBlur();
  };
}
