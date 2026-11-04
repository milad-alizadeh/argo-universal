import type { WireNode } from '@repo/contracts/plugins/wire';
import { Component, type ReactNode } from 'react';

const drawings = new WeakMap<WireNode, string>();

let counted = 0;

// A tree is one drawing for as long as it is the very same tree, so a newer answer tries again.
export function drawingOf(root: WireNode): string {
  const known = drawings.get(root);

  if (known !== undefined) return known;

  counted += 1;

  const next = String(counted);

  drawings.set(root, next);

  return next;
}

interface PluginDrawingBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  resetKey?: string;
  // Told why a drawing fell back, when something is listening.
  onFallback?: (reason: string) => void;
}

interface DrawingState {
  failed: boolean;
  resetKey?: string;
}

export class PluginDrawingBoundary extends Component<
  PluginDrawingBoundaryProps,
  DrawingState
> {
  public override state: DrawingState = { failed: false };
  public static getDerivedStateFromError(): DrawingState {
    return { failed: true };
  }
  public static getDerivedStateFromProps(
    { resetKey }: PluginDrawingBoundaryProps,
    state: DrawingState,
  ): DrawingState | null {
    return resetKey === state.resetKey ? null : { failed: false, resetKey };
  }
  public override componentDidCatch(error: Error): void {
    this.props.onFallback?.(error.message);
  }
  public override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
