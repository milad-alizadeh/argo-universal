import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import type { ComponentType } from 'react';
import { CanvasFallback } from './canvas-boundary';
import type { CanvasProps } from './canvas-props';

const loadCanvas = (): Promise<{ default: ComponentType<CanvasProps> }> =>
  import('./canvas-renderer');

const options = { locateFile: (file: string): string => `/${file}` };

export function CanvasLoader(props: CanvasProps): React.JSX.Element {
  return (
    <WithSkiaWeb
      opts={options}
      getComponent={loadCanvas}
      componentProps={props}
      fallback={<CanvasFallback label={props.label} loading />}
    />
  );
}
