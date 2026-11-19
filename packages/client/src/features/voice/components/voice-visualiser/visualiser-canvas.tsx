import type * as React from 'react';
import { useRef } from 'react';
import { View } from 'react-native';
import { orbName } from '../voice-orb/voice-orb-props';
import { useCanvasLoop, type CanvasPainter } from './canvas-loop';
import {
  wideDrawing,
  type VoiceVisualiserProps,
} from './voice-visualiser-props';

type Props = VoiceVisualiserProps & { painter: () => CanvasPainter };

// The canvas carries the lit colour and its parent the unlit one, both App tokens the painter reads off the page.
function PaintedCanvas({ painter, ...props }: Props): React.JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null);
  useCanvasLoop(canvas, props, painter);

  return (
    <div className="text-muted-foreground">
      <canvas
        ref={canvas}
        width={wideDrawing.width * window.devicePixelRatio}
        height={wideDrawing.height * window.devicePixelRatio}
        className="block text-tone-accent-400"
        style={wideDrawing}
      />
    </div>
  );
}

/*
 * The wide web canvas the matrix and the wave paint on, named to assistive tech as the orb is. Only `.web.tsx`
 * drawings use it: a phone has no DOM canvas.
 */
export function VisualiserCanvas(props: Props): React.JSX.Element {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={orbName(props.state)}
      className="overflow-hidden rounded-2xl bg-card"
      style={wideDrawing}
    >
      <PaintedCanvas {...props} />
    </View>
  );
}
