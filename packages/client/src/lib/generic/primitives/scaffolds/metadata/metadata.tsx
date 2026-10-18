import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem, type ListItemProps } from '#primitives/lists/list-item';
import { withOccurrenceKeys } from '../../../occurrence-keys';
import type { MetadataProps } from './metadata-props';
import { MetadataValue, valueLabel } from './metadata-value';

type Row = MetadataProps['rows'][number];

const listOptions = { padding: 0, paddingTop: 0, paddingBottom: 0 } as const;

export function Metadata({ title, rows }: MetadataProps): ReactNode {
  if (rows.length === 0) return null;

  return (
    <List
      {...listOptions}
      appearance={Platform.OS === 'web' ? 'plain' : 'grouped'}
    >
      <ListSection title={title}>
        {withOccurrenceKeys(rows, (row) => row.title).map(({ item, key }) => (
          <MetadataRow key={key} row={item} />
        ))}
      </ListSection>
    </List>
  );
}

function labelPlacement(): ListItemProps['labelPlacement'] {
  if (Platform.OS === 'web') return 'above';

  return Platform.OS === 'ios' ? 'beside' : undefined;
}

function valuePlacement(
  value: ReactNode,
): Pick<ListItemProps, 'trailing' | 'meta'> {
  return Platform.OS === 'android' ? { meta: value } : { trailing: value };
}

function MetadataRow({ row }: { row: Row }): ReactElement {
  const value = <MetadataValue value={row.value} />;

  const accessibilityLabel =
    row.accessibilityLabel ?? `${row.title}, ${valueLabel(row.value)}`;

  return (
    <View className={Platform.OS === 'web' ? 'mb-4' : undefined}>
      <ListItem
        title={row.title}
        labelPlacement={labelPlacement()}
        accessibilityLabel={accessibilityLabel}
        {...valuePlacement(value)}
      />
    </View>
  );
}
