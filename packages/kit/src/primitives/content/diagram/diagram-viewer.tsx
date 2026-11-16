import type { DiagramDrawing } from '@repo/contracts/kit-diagram';
import type * as React from 'react';
import { View, type ViewStyle } from 'react-native';
import {
  CentredModal,
  CentredModalRoot,
} from '#primitives/overlays/centred-overlay';
import {
  type Camera,
  CanvasFrame,
  type CanvasFrameProps,
} from '#primitives/visual/canvas';
import { DiagramSvg } from './diagram-artwork';
import { ViewerBar } from './diagram-viewer-bar';
import { type ViewerCamera, useViewerCamera } from './use-viewer-camera';

interface DiagramViewerProps {
  onClose: () => void;
  drawing: DiagramDrawing;
  title: string;
  label: string;
}

function placed(drawing: DiagramDrawing, camera: Camera): ViewStyle {
  return {
    position: 'absolute',
    width: drawing.width,
    height: drawing.height,
    transformOrigin: 'top left',
    transform: [
      { translateX: camera.x },
      { translateY: camera.y },
      { scale: camera.scale },
    ],
  };
}

type CanvasProps = Pick<DiagramViewerProps, 'drawing' | 'label'> & {
  camera: ViewerCamera;
};

const frameProps = ({
  label,
  camera,
}: CanvasProps): Omit<CanvasFrameProps, 'children'> => ({
  label,
  camera: 'pan-zoom',
  view: camera.view,
  onCamera: camera.onCamera,
  onSize: camera.onSize,
  onPress: camera.onPress,
  onHover: () => {},
});

// Pinch, drag, the wheel and the arrow keys move the drawing, through the kit Canvas's own camera.
function ViewerCanvas(props: CanvasProps): React.JSX.Element {
  return (
    <View className="flex-1" testID="diagram-viewer-canvas">
      <CanvasFrame {...frameProps(props)}>
        <View style={placed(props.drawing, props.camera.drawn)}>
          <DiagramSvg drawing={props.drawing} />
        </View>
      </CanvasFrame>
    </View>
  );
}

const cardClassName = 'h-full w-full overflow-hidden rounded-2xl bg-card';

// The diagram over the whole window, where it can be zoomed and panned; a double tap fits it again.
export function DiagramViewer(props: DiagramViewerProps): React.JSX.Element {
  const camera = useViewerCamera(props.drawing);

  return (
    <CentredModalRoot open onOpenChange={(open) => open || props.onClose()}>
      <CentredModal label={props.label} className={cardClassName}>
        <ViewerBar {...props} onFit={camera.reset} />
        <ViewerCanvas {...props} camera={camera} />
      </CentredModal>
    </CentredModalRoot>
  );
}
