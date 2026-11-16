import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Text, TextClassContext } from '#primitives/content/text';
import { ListItem, ListItemFrame } from '#primitives/lists/list-item';
import type { PropertyFieldLayout } from './properties-drawing';
import { usePropertiesDrawing } from './properties-place';
import { BesideField } from './property-field-beside';
import { PillField, IconField } from './property-field-pill';
import type { FieldProps, PropertyFieldProps } from './property-field-props';
import { groupProps } from './property-group';

export type { PropertyFieldProps } from './property-field-props';

const layouts = {
  stacked: StackedField,
  under: UnderField,
  beside: BesideField,
  value: ValueField,
  pill: PillField,
  icon: IconField,
} satisfies Record<PropertyFieldLayout, (props: FieldProps) => ReactElement>;

/*
 * A read-only label/value field of a read-only FieldGroup, drawn in the layout its FieldGroup's drawing names: stacked
 * (label above the value), beside (iOS's LabeledContent), under (Android's one-line row), its value alone under its
 * group's heading in an aside, or one Pill under the title.
 */
export function PropertyField(props: PropertyFieldProps): ReactElement {
  const Field = layouts[usePropertiesDrawing().field];

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
