import { Component, type ReactNode } from 'react';
import { View } from 'react-native';
import type { OrbSize } from './orb-props';
import { orbPixels } from './orb-size';

// The Orb's footprint with nothing drawn: while CanvasKit loads, and for good where it cannot draw.
export function OrbPlaceholder({
  size = 'md',
}: {
  size?: OrbSize;
}): React.JSX.Element {
  const pixels = orbPixels[size];

  return <View style={{ width: pixels, height: pixels }} />;
}

interface Props {
  size?: OrbSize;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

// A window without WebGL, such as Electron on a machine whose GPU Chromium blocks, cannot draw the Orb; the page around it keeps working.
export class OrbBoundary extends Component<Props, State> {
  public override state: State = { failed: false };
  public static getDerivedStateFromError(): State {
    return { failed: true };
  }
  public override render(): ReactNode {
    return this.state.failed ? (
      <OrbPlaceholder size={this.props.size} />
    ) : (
      this.props.children
    );
  }
}
