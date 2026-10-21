import { Text } from '@repo/kit/text';
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { lazy, memo, type JSX, type ComponentType } from 'react';
import type { RendererProps } from './model';
import '../evidence';

type Renderer = Promise<{ default: ComponentType<RendererProps> }>;

async function loadThree(): Renderer {
  const start = performance.now();
  const result = await import('./three/three-map.web');
  window.__codemap834.threeImportMs = performance.now() - start;

  return result;
}

const ThreeMap = lazy(loadThree);

const loadFlat = (): Renderer => import('./flat/flat-map.web');

const skiaOptions = {
  locateFile: (file: string): string => `/codemap-834/${file}`,
};

interface FlatLoaderProps extends RendererProps {
  fallback: string;
}

function Flat({ fallback, ...props }: FlatLoaderProps): JSX.Element {
  return (
    <WithSkiaWeb
      opts={skiaOptions}
      getComponent={loadFlat}
      componentProps={props}
      fallback={<Text>{fallback}</Text>}
    />
  );
}

const FlatLoader = memo(Flat);

export { FlatLoader, ThreeMap };
