import { Component, type ReactNode } from 'react';

interface PluginDrawingBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  resetKey?: string;
  onFallback: (reason: string) => void;
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
    props: PluginDrawingBoundaryProps,
    state: DrawingState,
  ): DrawingState | null {
    return props.resetKey === state.resetKey
      ? null
      : { failed: false, resetKey: props.resetKey };
  }
  public override componentDidCatch(error: Error): void {
    this.props.onFallback(error.message);
  }
  public override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
