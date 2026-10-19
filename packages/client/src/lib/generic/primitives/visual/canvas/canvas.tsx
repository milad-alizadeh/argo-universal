import { View } from 'react-native';
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

function CanvasRoot(props: CanvasProps): React.JSX.Element {
  const ratio = props.aspectRatio ?? props.width / props.height;

  return (
    <View className="bg-card" style={{ width: '100%', aspectRatio: ratio }}>
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
