import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Text, TextClassContext } from '#primitives/content/text';
import { spokenField, type MetadataRowProps } from './metadata-props';

function FieldLabel({ title }: Pick<MetadataRowProps, 'title'>): ReactElement {
  return (
    <Text role="secondary" tone="muted" numberOfLines={1}>
      {title}
    </Text>
  );
}

// Desktop draws a stacked label/value pair, not a row: no press, hover, separator or lanes.
export function MetadataRow(props: MetadataRowProps): ReactElement {
  return (
    <TextClassContext value={undefined}>
      <View
        role="group"
        aria-label={spokenField(props)}
        className="mb-4 w-full gap-1 select-none"
      >
        <FieldLabel title={props.title} />
        <View className="min-w-0 self-stretch">{props.children}</View>
      </View>
    </TextClassContext>
  );
}
