import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Text, TextClassContext } from '#primitives/content/text';
import { ListItem, ListItemFrame } from '#primitives/lists/list-item';
import type { MetadataFieldLayout } from './metadata-drawing';
import { useMetadataDrawing } from './metadata-drawing-context';
import { BesideField } from './metadata-field-beside';
import { groupProps } from './metadata-group';

export interface MetadataFieldProps {
  title: string;
  // What the value says, for the field's spoken label.
  valueLabel: string;
  accessibilityLabel?: string;
  // Whether the field reads as one element; a Link value stays its own, so it can be focused and activated.
  grouped?: boolean;
  // The read-only value: text, or text beside an icon, dot, avatar or Pills.
  children: ReactNode;
}

type FieldProps = MetadataFieldProps & { label: string };

const layouts = {
  stacked: StackedField,
  under: UnderField,
  beside: BesideField,
  inline: InlineField,
} satisfies Record<MetadataFieldLayout, (props: FieldProps) => ReactElement>;

/*
 * A read-only label/value field of a detail view's Metadata, drawn in the layout its Metadata's drawing names: stacked
 * (label above the value), beside (iOS's LabeledContent), under (Android's one-line row) or inline (the value alone).
 */
export function MetadataField(props: MetadataFieldProps): ReactElement {
  const Field = layouts[useMetadataDrawing().field];

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
      <StackedGroup {...props} />
    </TextClassContext>
  );
}

function StackedGroup(props: FieldProps): ReactElement {
  return (
    <View {...groupProps(props)} className={stackedClass}>
      <StackedLabel title={props.title} />
      <View className="min-w-0 self-stretch">{props.children}</View>
    </View>
  );
}

/*
 * Inline, a field is its name and its value on one line: a value such as a blocker's number says nothing on its own,
 * and the line is read left to right, so each pair names itself as the stacked column's label does.
 */
function InlineField(props: FieldProps): ReactElement {
  return (
    <View
      {...groupProps(props)}
      className="min-w-0 max-w-full flex-row items-center gap-1.5 select-none"
    >
      <StackedLabel title={props.title} />
      {props.children}
    </View>
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
  if (props.grouped === false) {
    return <ListItemFrame title={props.title} meta={props.children} />;
  }

  return (
    <ListItem
      title={props.title}
      meta={props.children}
      accessibilityLabel={props.label}
    />
  );
}
