import type * as React from 'react';
import { useSizeClassValue } from '../use-size-class/use-size-class-value';

interface SizeClassProps {
  // Medium follows compact until it has a Paper design (#762).
  only: 'compact' | 'wide';
  children: React.ReactNode;
}

// Content drawn at one size class only, such as a phone's own header or a wide window's page header.
export function SizeClass({ only, children }: SizeClassProps): React.ReactNode {
  const shown = useSizeClassValue({
    compact: only === 'compact',
    wide: only === 'wide',
  });

  return shown ? children : null;
}
