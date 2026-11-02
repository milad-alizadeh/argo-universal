import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';

export interface EntryFormSelectionProps {
  title: string;
  name?: string;
  value: string;
  description: string;
  chooseLabel: string;
  changeLabel: string;
  disabled?: boolean;
  onChoose?: () => void;
}

export function EntryFormSelection(
  props: EntryFormSelectionProps,
): ReactElement {
  return (
    <View className="gap-2">
      <Text role="heading" aria-level={2}>
        {props.title}
      </Text>
      {props.value ? <SelectedValue {...props} /> : <ChooseValue {...props} />}
      <Text role="secondary" tone="muted">
        {props.description}
      </Text>
    </View>
  );
}

function ChooseValue(props: EntryFormSelectionProps): ReactElement {
  return (
    <View className="items-start">
      <Button
        label={props.chooseLabel}
        variant="secondary"
        disabled={props.disabled}
        onPress={props.onChoose}
      />
    </View>
  );
}

function SelectedValue(props: EntryFormSelectionProps): ReactElement {
  return (
    <View className="flex-row items-center gap-3 rounded-lg border border-border bg-card p-3">
      <SelectionText {...props} />
      <Button
        label={props.changeLabel}
        variant="text"
        disabled={props.disabled}
        onPress={props.onChoose}
      />
    </View>
  );
}

function SelectionText(props: EntryFormSelectionProps): ReactElement {
  return (
    <View className="min-w-0 flex-1 gap-1">
      <Text role="heading" aria-level={3} numberOfLines={1}>
        {props.name}
      </Text>
      <Text role="secondary" tone="muted" selectable>
        {props.value}
      </Text>
    </View>
  );
}
