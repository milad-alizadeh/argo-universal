import type { DiagramDrawing } from '@repo/contracts/kit-diagram';
import { useCallback, useRef, useState } from 'react';
import {
  type Bounds,
  type Camera,
  fitCamera,
  initialCamera,
  sceneCamera,
} from '#primitives/visual/canvas';

const doubleTapMilliseconds = 300;

const noFrame: Bounds = { x: 0, y: 0, width: 0, height: 0 };

export interface ViewerCamera {
  // The person's pan and zoom over the fitted drawing; the start is the drawing fitted to the frame.
  view: Camera;
  onCamera: (view: Camera) => void;
  onSize: (frame: Bounds) => void;
  onPress: () => void;
  reset: () => void;
  // Where the drawing sits in the frame, at what scale.
  drawn: Camera;
}

// A second tap soon after the first fits the drawing again, as a double tap does in a photo.
function useDoubleTap(reset: () => void): () => void {
  const last = useRef(0);

  return useCallback(() => {
    const now = Date.now();
    const double = now - last.current < doubleTapMilliseconds;
    last.current = double ? 0 : now;

    if (double) reset();
  }, [reset]);
}

function fittedCamera(drawing: DiagramDrawing, frame: Bounds): Camera {
  const scene = { x: 0, y: 0, width: drawing.width, height: drawing.height };

  return frame.width > 0 ? fitCamera(scene, frame) : initialCamera;
}

export function useViewerCamera(drawing: DiagramDrawing): ViewerCamera {
  const [view, onCamera] = useState(initialCamera);
  const [frame, onSize] = useState(noFrame);
  const reset = useCallback(() => onCamera(initialCamera), []);
  const onPress = useDoubleTap(reset);
  const drawn = sceneCamera(fittedCamera(drawing, frame), view);

  return { view, onCamera, onSize, onPress, reset, drawn };
}
