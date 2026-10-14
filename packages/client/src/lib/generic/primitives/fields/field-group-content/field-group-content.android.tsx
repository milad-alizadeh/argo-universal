import type * as React from 'react';
import { useWide } from '../../../use-wide/use-wide';
import { HostedRow } from '../field-group/field-group-row';
import { FieldGroupContent as WebFieldGroupContent } from './field-group-content.tsx';

// A Compose column sizes a plain React Native view by its last layout, so the row hosts it and takes its height.
export function FieldGroupContent({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const Row = useWide() ? WebFieldGroupContent : HostedRow;

  return <Row>{children}</Row>;
}
