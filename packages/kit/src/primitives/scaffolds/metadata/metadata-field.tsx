import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Text, TextClassContext } from '#primitives/content/text';
import { ListItem, ListItemFrame } from '#primitives/lists/list-item';
import type { MetadataFieldLayout } from './metadata-drawing';
import { useMetadataDrawing } from './metadata-drawing-context';
import { BesideField } from './metadata-field-beside';
import { PillField, IconField } from './metadata-field-pill';
import type { FieldProps, MetadataFieldProps } from './metadata-field-props';
import { groupProps } from './metadata-group';

export type { MetadataFieldProps } from './metadata-field-props';

const layouts = {
  stacked: StackedField,
  under: UnderField,
  beside: BesideField,
  value: ValueField,
  pill: PillField,
  icon: IconField,
} satisfies Record<MetadataFieldLayout, (props: FieldProps) => ReactElement>;

/*
 * A read-only label/value field of a detail view's Metadata, drawn in the layout its Metadata's drawing names: stacked
 * (label above the value), beside (iOS's LabeledContent), under (Android's one-line row), its value alone under its
 * group's heading in an aside, or one Pill under the title.
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

function StackedLabel({ title }: { title: string }): ReactElement {
  return (
    <Text role="secondary" tone="muted" numberOfLines={1}>
      {title}
    </Text>
  );
}

// In an aside the group's heading names the value, or its glyph does, so the row holds the value alone.
function ValueField(props: FieldProps): ReactElement {
  return (
    <TextClassContext value={undefined}>
      <View
        {...groupProps(props)}
        className="min-h-8 min-w-0 justify-center select-none"
      >
        {props.children}
      </View>
    </TextClassContext>
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
