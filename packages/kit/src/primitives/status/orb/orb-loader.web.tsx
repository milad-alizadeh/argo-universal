import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import type { ComponentType } from 'react';
import { OrbPlaceholder } from './orb-boundary';
import type { OrbProps } from './orb-props';

const loadOrb = (): Promise<{ default: ComponentType<OrbProps> }> =>
  import('./orb-renderer');

const options = { locateFile: (file: string): string => `/${file}` };

export function OrbLoader(props: OrbProps): React.JSX.Element {
  return (
    <WithSkiaWeb
      opts={options}
      getComponent={loadOrb}
      componentProps={props}
      fallback={<OrbPlaceholder size={props.size} />}
    />
  );
}
