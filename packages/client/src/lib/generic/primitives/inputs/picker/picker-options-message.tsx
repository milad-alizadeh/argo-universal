import type * as React from 'react';
import { View } from 'react-native';
import { Spinner } from '#primitives/display/spinner';
import { Text } from '#primitives/display/text';

type MessageSource = {
  options: readonly unknown[];
  loadError?: string;
  // Shown when there is no option to list.
  emptyLabel?: string;
};

function emptyMessage(props: MessageSource): string | undefined {
  if (props.options.length > 0) return undefined;

  return props.emptyLabel ?? 'No options';
}

// Why there is no option to list, or undefined when there are options.
export function optionsMessage(props: MessageSource): string | undefined {
  return props.loadError ?? emptyMessage(props);
}

export function LoadingMessage(props: {
  label: string;
  message?: string;
}): React.JSX.Element {
  return (
    <View className="min-h-11 flex-row items-center gap-2 px-2">
      <Spinner accessibilityLabel={`Loading ${props.label}`} />
      <Text role="secondary" tone="muted" accessibilityRole="status">
        {props.message ?? 'Loading…'}
      </Text>
    </View>
  );
}

export function OptionsMessage(props: {
  message: string;
  failure: boolean;
}): React.JSX.Element {
  return (
    <Text
      role="secondary"
      tone="muted"
      accessibilityRole={props.failure ? 'alert' : 'status'}
      className="px-2 py-3"
    >
      {props.message}
    </Text>
  );
}
