import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useWide } from '../../../use-wide/use-wide';
import type { FieldGroupContentProps } from './field-group-content-props';
import { FieldGroupContent as WebFieldGroupContent } from './field-group-content.tsx';
import { HostedRow } from './hosted-row';

const rowFrame = (): ReturnType<typeof fillMaxWidth>[] => [fillMaxWidth()];

// A Compose column sizes a plain React Native view by its last layout, so the row hosts it and takes its height.
export function FieldGroupContent({
  children,
}: FieldGroupContentProps): React.JSX.Element {
  if (useWide()) return <WebFieldGroupContent>{children}</WebFieldGroupContent>;

  return <HostedRow frame={rowFrame}>{children}</HostedRow>;
}

FieldGroupContent satisfies React.ComponentType<FieldGroupContentProps>;
