import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { Text, TextClassContext } from '#primitives/content/text';
import { ListItem, ListItemFrame } from './list-item';

export interface ListItemFieldProps {
  title: string;
  // What the value says, for the field's spoken label.
  valueLabel: string;
  accessibilityLabel?: string;
  // The read-only value: text, or text beside an icon, dot, avatar or Pills.
  children: ReactNode;
}

type FieldProps = ListItemFieldProps & { label: string };

const Field = Platform.select({
  web: StackedField,
  android: UnderField,
  default: BesideField,
});

/*
 * A read-only label/value field, as in a detail view's Metadata.
 * Web stacks the label above the value, iOS sets them side by side (LabeledContent), and Android puts the value under the label.
 */
export function ListItemField(props: ListItemFieldProps): ReactElement {
  return (
    <Field
      {...props}
      label={props.accessibilityLabel ?? `${props.title}, ${props.valueLabel}`}
    />
  );
}

// A stacked label/value pair, not a row: no press, hover, separator or lanes.
function StackedField(props: FieldProps): ReactElement {
  return (
    <TextClassContext value={undefined}>
      <View
        accessible
        role="group"
        accessibilityLabel={props.label}
        className="mb-4 w-full gap-1 select-none"
      >
        <StackedTitle title={props.title} />
        <View className="min-w-0 self-stretch">{props.children}</View>
      </View>
    </TextClassContext>
  );
}

function StackedTitle({ title }: { title: string }): ReactElement {
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

function BesideField(props: FieldProps): ReactElement {
  return (
    <ListItemFrame title={props.title} content={<BesideContent {...props} />} />
  );
}

// The row reads as one element with the field's label, as a ListItem does.
function BesideContent(props: FieldProps): ReactElement {
  return (
    <View
      accessible
      accessibilityLabel={props.label}
      className="min-w-0 flex-1 flex-row items-center gap-4"
    >
      <BesideTitle title={props.title} />
      <View className="min-w-0 flex-1 flex-row items-center justify-end gap-1">
        {props.children}
      </View>
    </View>
  );
}

function BesideTitle({ title }: { title: string }): ReactElement {
  return (
    <View className="min-w-0 max-w-1/2 shrink">
      <Text role="row" numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}
