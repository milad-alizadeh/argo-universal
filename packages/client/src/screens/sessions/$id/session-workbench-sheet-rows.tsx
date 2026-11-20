import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import {
  useSheet,
  type SheetScreenProps,
} from '@repo/kit/primitives/overlays/sheet';
import type { ReactElement } from 'react';

export interface WorkbenchRow {
  key: string;
  label: string;
  value?: string;
  disabled?: boolean;
  onPress?: () => void;
  page?: Omit<SheetScreenProps, 'name'>;
}

export interface WorkbenchGroup {
  key: string;
  title: string;
  rows: readonly WorkbenchRow[];
}

type Visit = (row: WorkbenchRow) => void;

interface OverviewProps {
  groups: readonly WorkbenchGroup[];
  onVisit: Visit;
}

export function WorkbenchOverview({
  groups,
  onVisit,
}: OverviewProps): ReactElement {
  const { push } = useSheet();

  const visit = (row: WorkbenchRow): void => {
    onVisit(row);
    push(row.key);
  };

  return (
    <FieldGroup>{groups.map((group) => fieldSection(group, visit))}</FieldGroup>
  );
}

const fieldSection = (
  { key, title, rows }: WorkbenchGroup,
  visit: Visit,
): ReactElement => (
  <FieldGroup.Section key={key} title={title}>
    {rows.map((row) => fieldRow(row, visit))}
  </FieldGroup.Section>
);

const fieldRow = (row: WorkbenchRow, visit: Visit): ReactElement => (
  <FieldGroup.Link
    key={row.key}
    title={row.label}
    value={row.value}
    disabled={row.disabled}
    action={!row.page}
    onPress={() => openRow(row, visit)}
  />
);

function openRow(row: WorkbenchRow, visit: Visit): void {
  row.onPress?.();

  if (row.page) visit(row);
}
