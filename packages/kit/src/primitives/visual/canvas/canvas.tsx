import { View, type ViewStyle } from 'react-native';
import { useScreenBleed } from '#kit/screen-bleed';
import { CanvasBoundary } from './canvas-boundary';
import { CanvasLoader } from './canvas-loader';
import type { CanvasProps } from './canvas-props';
import {
  CanvasRect,
  CanvasCircle,
  CanvasLine,
  CanvasPath,
  CanvasText,
  CanvasGroup,
} from './canvas-shapes';

// In a page that runs to its edges the canvas fills the body; anywhere else it keeps its scene's shape.
function frameStyle(props: CanvasProps, bleed: boolean): ViewStyle {
  if (bleed) return { width: '100%', flex: 1, minHeight: 0 };

  return { width: '100%', aspectRatio: props.aspectRatio ?? props.width / props.height };
}

function CanvasRoot(props: CanvasProps): React.JSX.Element {
  return (
    <View className="bg-card" style={frameStyle(props, useScreenBleed())}>
      <CanvasBoundary label={props.label} source={props.children}>
        <CanvasLoader {...props} />
      </CanvasBoundary>
    </View>
  );
}

export const Canvas = Object.assign(CanvasRoot, {
  Rect: CanvasRect,
  Circle: CanvasCircle,
  Line: CanvasLine,
  Path: CanvasPath,
  Text: CanvasText,
  Group: CanvasGroup,
});

export type { CanvasProps } from './canvas-props';
