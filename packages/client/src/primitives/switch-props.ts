import type * as SwitchPrimitives from '@rn-primitives/switch';
import type * as React from 'react';

export type SwitchProps = React.ComponentProps<typeof SwitchPrimitives.Root> & {
  size?: 'default' | 'small';
};
