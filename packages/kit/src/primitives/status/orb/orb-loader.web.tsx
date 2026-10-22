import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import type { ComponentType } from 'react';
import { View } from 'react-native';
import type { OrbProps } from './orb-props';
import { orbPixels } from './orb-size';

const loadOrb = (): Promise<{ default: ComponentType<OrbProps> }> =>
  import('./orb-renderer');

const options = { locateFile: (file: string): string => `/${file}` };

export function OrbLoader(props: OrbProps): React.JSX.Element {
  const pixels = orbPixels[props.size ?? 'md'];

  return (
    <WithSkiaWeb
      opts={options}
      getComponent={loadOrb}
      componentProps={props}
      fallback={<View style={{ width: pixels, height: pixels }} />}
    />
  );
}
