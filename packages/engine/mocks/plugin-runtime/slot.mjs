import { Text } from '@argo/plugin-kit';
import { jsx } from '@argo/plugin-kit/jsx-runtime';

// Fills Project details whether or not its manifest declares the Slot.
export function register(argo) {
  argo.slots.register('argo/project/details/v1', ({ context }) =>
    jsx(Text, {
      children: `${context.projectId} ${Object.isFrozen(context) ? 'frozen' : 'thawed'}`,
    }),
  );
}
