import type * as React from 'react';
import type { NavigationDestination } from '#lib/product/navigation/context';
import { hrefFor } from '#lib/product/navigation/routes';
import { ListItem } from '#primitives/list-item';
import { useWide } from '../../../lib/generic/use-wide';
import type { SettingsRow } from './settings-list-data';
import type { SettingsListProps } from './settings-list-props';

type RowsProps = Pick<SettingsListProps, 'selectedDestination' | 'onSelect'> & {
  rows: SettingsRow[];
};

export function SettingsRows(props: RowsProps): React.JSX.Element {
  const wide = useWide();
  return (
    <>
      {props.rows.map((row) => (
        <ListItem
          key={row.title}
          {...row}
          href={hrefFor(row.destination).pathname}
          selected={
            wide && selectedRow(row.destination, props.selectedDestination)
          }
          onPress={() => props.onSelect(row.destination)}
        />
      ))}
    </>
  );
}

function selectedRow(
  destination: NavigationDestination,
  selected?: NavigationDestination,
): boolean {
  if (destination.to === selected?.to) return true;
  if (destination.to === 'settings-projects')
    return selected?.to === 'settings-project';
  return (
    destination.to === 'settings-agents' &&
    (selected?.to === 'settings-agent' || selected?.to === 'settings-agent-new')
  );
}
