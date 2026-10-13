import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Caret } from './caret';
import { useClampLeaf } from './clamp-leaves';

// A block a clamp cuts below as a whole, with the streaming caret after it.
export function ClampedBlock({
  caret,
  children,
}: {
  caret: boolean;
  children: ReactNode;
}): React.JSX.Element {
  const block = useClampLeaf();
  return (
    <View ref={block} className="gap-2.5">
      {children}
      {caret && <Caret />}
    </View>
  );
}
