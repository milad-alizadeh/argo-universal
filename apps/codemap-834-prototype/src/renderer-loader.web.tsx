import { Text } from '@repo/client/text';
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { lazy, type JSX, type ComponentType } from 'react';
import type { MapProps } from './model';
import './evidence';

async function loadThree(): Promise<{ default: ComponentType<MapProps> }> {
  const start = performance.now();
  const result = await import('./three-map.web');
  window.__codemap834.threeImportMs = performance.now() - start;

  return result;
}

const ThreeMap = lazy(loadThree);

const loadFlat = (): Promise<{ default: ComponentType<MapProps> }> =>
  import('./flat-map.web');

const skiaOptions = {
  locateFile: (file: string): string => `/codemap-834/${file}`,
};

export function FlatLoader(props: MapProps): JSX.Element {
  return (
    <WithSkiaWeb
      opts={skiaOptions}
      getComponent={loadFlat}
      componentProps={props}
      fallback={<Text>Measuring argo-universal</Text>}
    />
  );
}

export { ThreeMap };
