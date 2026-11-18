import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { lazy, Suspense } from 'react';
import { OrbPlaceholder } from './orb-boundary';
import type { OrbDriverProps } from './orb-driver-props';
import type { OrbProps } from './orb-props';
import type * as Renderer from './orb-renderer';

const options = { locateFile: (file: string): string => `/${file}` };

// CanvasKit loads once, then the renderer that draws with it.
async function loadRenderer(): Promise<typeof Renderer> {
  await LoadSkiaWeb(options);

  return import('./orb-renderer');
}

/*
 * One lazy component for every orb, made here and not per orb: once the renderer has loaded, a new
 * orb draws in its first render, with no empty placeholder shown in between.
 */
const LazyOrb = lazy(loadRenderer);

const LazyDriver = lazy(async () => {
  const { OrbDriver } = await loadRenderer();

  return { default: OrbDriver };
});

export function OrbLoader(props: OrbProps): React.JSX.Element {
  return (
    <Suspense fallback={<OrbPlaceholder size={props.size} />}>
      <LazyOrb {...props} />
    </Suspense>
  );
}

export function OrbDriverLoader(props: OrbDriverProps): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <LazyDriver {...props} />
    </Suspense>
  );
}
