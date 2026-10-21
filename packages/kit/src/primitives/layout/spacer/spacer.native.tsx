import { Spacer as NativeSpacer } from '@expo/ui';
import { Host } from '#primitives/native/host';
import type { SpacerProps } from './spacer';

export type { SpacerProps } from './spacer';

const flexible = { flex: 1 };

export function Spacer(_props: SpacerProps): React.JSX.Element {
  return (
    <Host style={flexible}>
      <NativeSpacer flexible />
    </Host>
  );
}
