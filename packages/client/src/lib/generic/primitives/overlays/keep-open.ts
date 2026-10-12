// Radix closes a dialog on Escape or a press outside unless the event is cancelled.
export function keepOpen(
  dismissible: boolean | undefined,
): (event: Event) => void {
  return (event) => {
    if (dismissible === false) event.preventDefault();
  };
}
