import type { DiagramDrawing } from '@repo/contracts/kit-diagram';
import type * as React from 'react';
import { View, type ViewStyle, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

function ViewerCanvas(props: CanvasProps): React.JSX.Element {
  return (
    <View className="flex-1" testID="diagram-viewer-canvas">
      <CanvasFrame {...frameProps(props)}>
        <View
          testID="diagram-viewer-drawing"
          style={placed(props.drawing, props.camera.drawn)}
        >
          <DiagramSvg drawing={props.drawing} />
        </View>
      </CanvasFrame>
    </View>
  );
}

const cardClassName = 'overflow-hidden rounded-2xl bg-card';

// The centred modal's scrim pads the card by 8 on each side.
const scrimInset = 8;

// The modal's wrappers take their size from the card, so the card takes its size from the window.
function useWindowFrame(): ViewStyle {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return {
    width: window.width - scrimInset * 2,
    height: window.height - insets.top - insets.bottom - scrimInset * 2,
  };
}

export function DiagramViewer(props: DiagramViewerProps): React.JSX.Element {
  const camera = useViewerCamera(props.drawing);

  return (
    <CentredModalRoot open onOpenChange={(open) => open || props.onClose()}>
      <CentredModal label={props.label} className={cardClassName}>
        <View style={useWindowFrame()} testID="diagram-viewer">
          <ViewerBar {...props} onFit={camera.reset} />
          <ViewerCanvas {...props} camera={camera} />
        </View>
      </CentredModal>
    </CentredModalRoot>
  );
}
