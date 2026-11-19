import type * as React from 'react';
import { useRef } from 'react';
import { View } from 'react-native';
import { orbName, voiceOrbSize } from '../voice-orb/voice-orb-props';
import { useCanvasLoop, type CanvasPainter } from './canvas-loop';
import type { VoiceVisualiserProps } from './voice-visualiser-props';

const footprint = { width: voiceOrbSize, height: voiceOrbSize };

type Props = VoiceVisualiserProps & { painter: () => CanvasPainter };

// The canvas carries the lit colour and its parent the unlit one, both App tokens the painter reads off the page.
function PaintedCanvas({ painter, ...props }: Props): React.JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null);
  useCanvasLoop(canvas, props, painter);

  return (
    <div className="text-muted-foreground">
      <canvas
        ref={canvas}
        width={voiceOrbSize * window.devicePixelRatio}
        height={voiceOrbSize * window.devicePixelRatio}
        className="block text-tone-info-500"
        style={footprint}
      />
    </div>
  );
}

/*
 * A web canvas the matrix and the wave paint on, in the orb's footprint and named to assistive tech as the orb is. Only
 * `.web.tsx` drawings use it: a phone has no DOM canvas.
 */
export function VisualiserCanvas(props: Props): React.JSX.Element {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={orbName(props.state)}
      className="overflow-hidden rounded-full bg-card"
      style={footprint}
    >
      <PaintedCanvas {...props} />
    </View>
  );
}
