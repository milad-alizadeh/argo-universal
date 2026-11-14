import { useEffect, useState } from 'react';

type Highlight = (index: number) => void;

/*
 * A hover moves the highlight only once the pointer has moved since the options last changed. A menu that opens
 * or refilters under a resting pointer reports a hover on the row beneath it, which must not take the highlight
 * from the first option. A real move reports its hover before its `mousemove`, so that hover is held for the move.
 */
class HoverGate {
  private highlight: Highlight | null = null;
  private moved = false;
  private position: string | null = null;
  private held: number | null = null;

  bind = (highlight: Highlight): void => {
    this.highlight = highlight;
  };

  reset = (): void => {
    this.moved = false;
    this.held = null;
  };

  hover = (index: number): void => {
    if (this.moved) this.highlight?.(index);
    else this.held = index;
  };

  // A move to a new spot, not the repeat a layout change makes at the same one.
  private moves(event: MouseEvent): boolean {
    const next = `${event.clientX},${event.clientY}`;
    const changed = this.position !== null && this.position !== next;
    this.position = next;

    return changed;
  }

  private move = (event: MouseEvent): void => {
    if (this.moved || !this.moves(event)) return;

    this.moved = true;
    this.applyHeld();
  };

  private applyHeld(): void {
    if (this.held !== null) this.highlight?.(this.held);
  }

  listen = (): (() => void) => {
    window.addEventListener('mousemove', this.move, true);

    return (): void => window.removeEventListener('mousemove', this.move, true);
  };
}

// The highlight setter, gated so a hover under a resting pointer leaves the first option highlighted.
export function useGatedHighlight(
  options: readonly unknown[],
  highlight: Highlight,
): Highlight {
  const [gate] = useState(() => new HoverGate());

  useEffect(() => {
    gate.bind(highlight);
  }, [gate, highlight]);

  useEffect(() => gate.reset(), [gate, options]);
  useEffect(() => gate.listen(), [gate]);

  return gate.hover;
}
