import type * as React from 'react';
import { Pressable, View } from 'react-native';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { Icon } from '../../lib/icon';

type PressProps = { label: string; onPress: () => void; disabled?: boolean };
type EntryRowProps = PressProps & { detail?: string };
export type EntryListItem = EntryRowProps & { key: string };
type EntryListProps = {
  items: readonly EntryListItem[];
  disabled: boolean;
  addLabel: string;
  onAdd: () => void;
};

export function AddEntry(props: PressProps): React.JSX.Element {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 self-start"
      disabled={props.disabled}
      onPress={props.onPress}
    >
      <Icon name="add" />
      <Text className="type-body">{props.label}</Text>
    </Button>
  );
}

export function RemoveEntryButton(props: PressProps): React.JSX.Element {
  return (
    <Button
      variant="ghost"
      size="icon"
      accessibilityLabel={props.label}
      disabled={props.disabled}
      onPress={props.onPress}
    >
      <Icon name="close" className="text-muted-foreground" />
    </Button>
  );
}

// The phone list of arguments or variables, with the button that adds one.
export function EntryList(props: EntryListProps): React.JSX.Element {
  return (
    <>
      <EntryRows items={props.items} disabled={props.disabled} />
      <AddEntry
        label={props.addLabel}
        disabled={props.disabled}
        onPress={props.onAdd}
      />
    </>
  );
}

function EntryRows({
  items,
  disabled,
}: Pick<EntryListProps, 'items' | 'disabled'>): React.JSX.Element | null {
  if (items.length === 0) return null;
  return (
    <View className="rounded-lg border border-border">
      {items.map(({ key, ...item }) => (
        <EntryRow key={key} disabled={disabled} {...item} />
      ))}
    </View>
  );
}

// One phone list row naming an argument or variable; pressing it opens its sheet.
function EntryRow(props: EntryRowProps): React.JSX.Element {
  return (
    <Pressable
      role="button"
      accessibilityLabel={`Edit ${props.label}`}
      disabled={props.disabled}
      onPress={props.onPress}
      className="min-h-11 flex-row items-center gap-2 px-3 py-2"
    >
      <EntryRowText label={props.label} detail={props.detail} />
      <Icon name="chevron-right" size="sm" className="text-muted-foreground" />
    </Pressable>
  );
}

function EntryRowText(
  props: Pick<EntryRowProps, 'label' | 'detail'>,
): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1">
      <Text className="type-code" numberOfLines={1}>
        {props.label}
      </Text>
      <EntryDetail detail={props.detail} />
    </View>
  );
}

function EntryDetail({
  detail,
}: Pick<EntryRowProps, 'detail'>): React.JSX.Element | null {
  if (detail === undefined) return null;
  return (
    <Text className="type-code text-muted-foreground" numberOfLines={1}>
      {detail}
    </Text>
  );
}
