// Where a pane's content sits along the window: its left edge and its laid-out width.
export interface PaneSpan {
  offset: number;
  width: number;
}

/*
 * How far a pane's content starts from where it ends, so it can slide there by transform alone (FLIP):
 * its centre then lands where it was, so the centred Session column never jumps, and a pane that keeps
 * its width, such as the Inspector sliding in or out, starts at its old edge.
 */
export function paneShift(from: PaneSpan, to: PaneSpan): number {
  return from.offset + from.width / 2 - (to.offset + to.width / 2);
}
