import type * as React from 'react';
import { useWide } from '../../../use-wide/use-wide';
import { HostedRow } from '../field-group/field-group-row';
import { FieldRow as WebFieldRow } from './field-row-view.tsx';

// A Compose column sizes a plain React Native view by its last layout, so the row hosts it and takes its height.
export function FieldRow({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const Row = useWide() ? WebFieldRow : HostedRow;

  return <Row>{children}</Row>;
}
