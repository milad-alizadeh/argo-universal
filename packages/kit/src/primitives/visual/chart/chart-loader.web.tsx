import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import type { ComponentType } from 'react';
import { CanvasFallback } from '../canvas/canvas-boundary';
import type { ChartProps } from './chart-data';

const loadChart = (): Promise<{ default: ComponentType<ChartProps> }> =>
  import('./chart-renderer');

const options = { locateFile: (file: string): string => `/${file}` };

// CanvasKit loads the first time a chart appears; only this loader is in the launch bundle.
export function ChartLoader(props: ChartProps): React.JSX.Element {
  return (
    <WithSkiaWeb
      opts={options}
      getComponent={loadChart}
      componentProps={props}
      fallback={<CanvasFallback label={props.label} loading />}
    />
  );
}
