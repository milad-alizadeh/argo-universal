import type { ReactElement, ReactNode } from 'react';
import { flattenedChildren } from '#kit/flattened-children';
import {
  choiceSummary,
  FieldPicker,
  narrowed,
  type FieldPickerProps,
} from '#primitives/fields/field-picker';
import {
  FieldValue,
  type FieldValueProps,
} from '#primitives/fields/field-value';
import {
  FieldGroupSection,
  type FieldGroupSectionProps,
} from '../field-group-section';
import { isElementOf } from './kit-element';
import { PropertyPicker } from './property-picker';
import { valueFields, type ValueRow } from './property-value-fields';

export interface PropertySection {
  key: string;
  title?: string;
  fields: ReactElement[];
}

// A Picker's own words are its chosen options' labels, which its children may lead with a glyph or replace.
const pickedValue = (picker: FieldPickerProps): ValueRow => ({
  title: picker.title,
  value: choiceSummary(narrowed(picker)),
  children: picker.children,
});

// A Picker is one field, its value the fields its children make; a Value is those fields itself. Other rows have no read-only drawing.
function rowFields(row: ReactNode): ReactElement[] {
  if (isElementOf<FieldValueProps>(row, FieldValue))
    return valueFields(row.props, String(row.key));

  if (!isElementOf<FieldPickerProps>(row, FieldPicker)) return [];

  return [
    <PropertyPicker
      key={String(row.key)}
      title={row.props.title}
      picker={row.props}
    >
      {valueFields(pickedValue(row.props), String(row.key))}
    </PropertyPicker>,
  ];
}

function sectionOf(node: ReactNode): PropertySection[] {
  if (!isElementOf<FieldGroupSectionProps>(node, FieldGroupSection)) return [];

  const fields = flattenedChildren(node.props.children).flatMap(rowFields);

  return fields.length === 0
    ? []
    : [{ key: String(node.key), title: node.props.title, fields }];
}

// A read-only FieldGroup's sections, each with the fields its rows show; a section with none draws nothing.
export const propertySections = (children: ReactNode): PropertySection[] =>
  flattenedChildren(children).flatMap(sectionOf);

const holdsValue = (row: ReactNode): boolean =>
  (isElementOf<FieldValueProps>(row, FieldValue) ||
    isElementOf<FieldPickerProps>(row, FieldPicker)) &&
  flattenedChildren(row.props.children).length > 0;

const sectionHoldsValue = (node: ReactNode): boolean =>
  isElementOf<FieldGroupSectionProps>(node, FieldGroupSection) &&
  flattenedChildren(node.props.children).some(holdsValue);

// A row whose value is kit components cannot sit in SwiftUI's Form or a Compose tree, so its FieldGroup draws read-only.
export const holdsProperties = (children: ReactNode): boolean =>
  flattenedChildren(children).some(sectionHoldsValue);
