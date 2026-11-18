import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useClampLeaf } from './clamp-leaves';

// A block a clamp cuts below as a whole.
export function ClampedBlock({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const block = useClampLeaf();

  return (
    <View ref={block} className="gap-2.5">
      {children}
    </View>
  );
}
