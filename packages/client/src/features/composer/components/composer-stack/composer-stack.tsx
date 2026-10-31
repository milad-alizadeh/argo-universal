import type * as React from 'react';
import { View } from 'react-native';

interface ComposerStackProps {
  // A row that sits over the Composer, such as where a new Session starts.
  above?: React.ReactNode;
  children: React.ReactNode;
}

/*
 * The Composer column gives its height up to the room above the keyboard (#1529). The stack sits between the two,
 * so it gives height up as well: a box that keeps its content's height there holds the Composer at that height and
 * pushes it past the column's bottom, behind the keyboard (#1606). The row above keeps its own height; only the
 * Composer, whose draft field shrinks, takes what is left.
 */
export function ComposerStack({
  above,
  children,
}: ComposerStackProps): React.JSX.Element {
  return (
    <View className="w-full min-h-0 shrink flex-col items-stretch gap-2">
      {above}
      {children}
    </View>
  );
}
