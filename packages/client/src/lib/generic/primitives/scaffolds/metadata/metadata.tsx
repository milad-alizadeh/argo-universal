import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { StatusDot } from '#primitives/status/status-dot';
import { MetadataPills } from './metadata-pills';
import type { MetadataProps } from './metadata-props';

type Row = MetadataProps['rows'][number];
type Value = Row['value'];

export function Metadata({ title, rows }: MetadataProps): ReactNode {
  if (rows.length === 0) return null;

  const desktop = Platform.OS === 'web';
  return (
    <List
      appearance={desktop ? 'plain' : 'grouped'}
      padding={0}
      paddingTop={0}
      paddingBottom={0}
    >
      <ListSection title={title}>
        {rows.map((row, index) => (
          <MetadataRow key={index} row={row} />
        ))}
      </ListSection>
    </List>
  );
}

function MetadataRow({ row }: { row: Row }): ReactElement {
  const desktop = Platform.OS === 'web';
  const below = Platform.OS === 'android';
  const value = <MetadataValue value={row.value} />;
  return (
    <View className={desktop ? 'mb-4' : undefined}>
      <ListItem
        title={row.title}
        labelPlacement={
          desktop ? 'above' : Platform.OS === 'ios' ? 'beside' : undefined
        }
        accessibilityLabel={
          row.accessibilityLabel ?? `${row.title}, ${valueLabel(row.value)}`
        }
        trailing={below ? undefined : value}
        meta={below ? value : undefined}
      />
    </View>
  );
}

function valueLabel(value: Value): string {
  return value.kind === 'pills'
    ? value.pills.map((pill) => pill.text).join(', ')
    : value.text;
}

function MetadataValue({ value }: { value: Value }): ReactElement {
  if (value.kind === 'pills') return <MetadataPills pills={value.pills} />;

  return (
    <View className="min-w-0 flex-row items-center gap-1.5">
      <ValueIcon value={value} />
      <Text
        role="row"
        tone={Platform.OS === 'web' ? undefined : 'muted'}
        className="min-w-0 shrink"
      >
        {value.text}
      </Text>
    </View>
  );
}

function ValueIcon({
  value,
}: {
  value: Exclude<Value, { kind: 'pills' }>;
}): ReactNode {
  if (value.kind === 'status')
    return (
      <StatusDot tone={value.tone} size={Platform.OS === 'ios' ? 'md' : 'sm'} />
    );

  return value.icon ? <Icon name={value.icon} role="body" /> : null;
}
