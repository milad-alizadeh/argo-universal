import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { List } from '@repo/kit/primitives/lists/list';
import {
  useSheet,
  type SheetDestination,
  type SheetScreenProps,
} from '@repo/kit/primitives/overlays/sheet';
import type { ComponentProps, ReactElement } from 'react';

type RowAppearance = Pick<
  ComponentProps<typeof FieldGroup.Link>,
  'leading' | 'leadingMark' | 'status'
>;

export interface WorkbenchRow extends RowAppearance {
  key: string;
  label: string;
  value?: string;
  disabled?: boolean;
  onPress?: () => void;
  // Opens a page outside the sheet, using the Session's existing navigation.
  navigate?: () => void;
  // The row's own page, pushed under its key.
  page?: Omit<SheetScreenProps, 'name'>;
  // Another row whose page this row opens, as a card's lines all open the card's one page.
  visits?: WorkbenchRow;
  // A page the sheet holds outside the Workbench's rows, such as a Run's Terminal.
  opens?: string | SheetDestination;
  // The row's page is in the sheet, but its section draws it only behind a row that opens the full list.
  hidden?: boolean;
}

/*
 * One Workbench card as a phone's sheet draws it: a FieldGroup section titled as the card is, holding the card's own
 * content as native rows (ADR-0042).
 */
export interface WorkbenchGroup {
  key: string;
  title?: string;
  rows: readonly WorkbenchRow[];
}

export type Visit = (row: WorkbenchRow) => void;

interface OverviewProps {
  groups: readonly WorkbenchGroup[];
  onVisit: Visit;
}

// How a row in the sheet opens what it names, wherever in the sheet it is drawn.
function useOpenRow(onVisit: Visit): (row: WorkbenchRow) => void {
  const { push } = useSheet();

  return (row) => {
    const visited = row.page ? row : row.visits;

    row.onPress?.();
    row.navigate?.();

    if (visited) {
      onVisit(visited);
      push(visited.key);
    } else if (row.opens) push(row.opens);
  };
}

export function WorkbenchOverview({
  groups,
  onVisit,
}: OverviewProps): ReactElement {
  const open = useOpenRow(onVisit);

  return (
    <FieldGroup>{groups.map((group) => fieldSection(group, open))}</FieldGroup>
  );
}

const shown = (rows: readonly WorkbenchRow[]): WorkbenchRow[] =>
  rows.filter((row) => !row.hidden);

const fieldSection = (
  { key, title, rows }: WorkbenchGroup,
  open: (row: WorkbenchRow) => void,
): ReactElement => (
  <FieldGroup.Section key={key} title={title}>
    {shown(rows).map((row) => fieldRow(row, open))}
  </FieldGroup.Section>
);

function fieldRow(
  row: WorkbenchRow,
  open: (row: WorkbenchRow) => void,
): ReactElement {
  const opensPage = Boolean(
    row.page ?? row.visits ?? row.opens ?? row.navigate,
  );

  if (!opensPage && !row.onPress)
    return (
      <FieldGroup.Value
        key={row.key}
        title={row.label}
        leading={typeof row.leading === 'string' ? row.leading : undefined}
        value={row.value ?? ''}
      />
    );

  return (
    <FieldGroup.Link
      key={row.key}
      id={row.key}
      title={row.label}
      value={row.value}
      leading={row.leading}
      leadingMark={row.leadingMark}
      status={row.status}
      disabled={row.disabled}
      action={!opensPage}
      onPress={() => open(row)}
    />
  );
}

interface RowListProps {
  label: string;
  rows: readonly WorkbenchRow[];
  onVisit: Visit;
}

/*
 * A card's full list, behind the row that names what the section left out. It is a grouped List, not a
 * FieldGroup, because it can grow without bound; on phones it still draws the same native rows (ADR-0042).
 */
export function WorkbenchRowList({
  label,
  rows,
  onVisit,
}: RowListProps): ReactElement {
  const open = useOpenRow(onVisit);

  return (
    <List appearance="grouped" fit={false} accessibilityLabel={label}>
      <List.Section>{rows.map((row) => fieldRow(row, open))}</List.Section>
    </List>
  );
}
