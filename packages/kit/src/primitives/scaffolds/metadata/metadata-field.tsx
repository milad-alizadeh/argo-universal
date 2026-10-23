import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { Text, TextClassContext } from '#primitives/content/text';
import { ListItem } from '#primitives/lists/list-item';
import { BesideField } from './metadata-field-beside';

export interface MetadataFieldProps {
  title: string;
  // What the value says, for the field's spoken label.
  valueLabel: string;
  accessibilityLabel?: string;
  // The read-only value: text, or text beside an icon, dot, avatar or Pills.
  children: ReactNode;
}

type FieldProps = MetadataFieldProps & { label: string };

const Field = Platform.select({
  web: StackedField,
  android: UnderField,
  default: BesideField,
});

/*
 * A read-only label/value field of a detail view's Metadata. Web stacks the label above the value; iOS sets them
 * side by side (LabeledContent), and Android puts the value under the label.
 */
export function MetadataField(props: MetadataFieldProps): ReactElement {
  return (
    <Field
      {...props}
      label={props.accessibilityLabel ?? `${props.title}, ${props.valueLabel}`}
    />
  );
}

const stackedClass = 'mb-4 w-full gap-1 select-none';

// A stacked label/value pair, not a row: no press, hover, separator or lanes.
function StackedField(props: FieldProps): ReactElement {
  return (
    <TextClassContext value={undefined}>
      <View
        accessible
        role="group"
        accessibilityLabel={props.label}
        className={stackedClass}
      >
        <StackedLabel title={props.title} />
        <View className="min-w-0 self-stretch">{props.children}</View>
      </View>
    </TextClassContext>
  );
}

function StackedLabel({ title }: { title: string }): ReactElement {
  return (
    <Text role="secondary" tone="muted" numberOfLines={1}>
      {title}
    </Text>
  );
}

function UnderField(props: FieldProps): ReactElement {
  return (
    <ListItem
      title={props.title}
      meta={props.children}
      accessibilityLabel={props.label}
    />
  );
}
