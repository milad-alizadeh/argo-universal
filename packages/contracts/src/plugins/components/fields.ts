import { defineKitComponent } from '../define-kit-component';
import { fieldGroupKitComponents } from '../field-group-kit-props';

const rows = [
  'FieldGroup.Value',
  'FieldGroup.Link',
  'FieldGroup.Toggle',
  'FieldGroup.Picker',
  'FieldGroup.DatePicker',
  'FieldGroup.Slider',
  'FieldGroup.TextField',
  'FieldGroup.SecretField',
  // A Button sits in a Section as a row of its own, as an action below the fields.
  'Button',
] as const;

const rowLabel = 'The title names the row and is announced with its value.';

export const fieldsComponents = {
  FieldGroup: defineKitComponent(
    'A page’s fixed rows of values and controls, arranged in sections.',
    fieldGroupKitComponents.FieldGroup.props,
    { group: 'fields', children: ['FieldGroup.Section'] as const },
  ),
  'FieldGroup.Section': defineKitComponent(
    'A titled section of FieldGroup rows, with an optional footer.',
    fieldGroupKitComponents['FieldGroup.Section'].props,
    { group: 'fields', children: rows },
  ),
  'FieldGroup.Value': defineKitComponent(
    'A read-only value at the end of a row.',
    fieldGroupKitComponents['FieldGroup.Value'].props,
    {
      group: 'fields',
      events: fieldGroupKitComponents['FieldGroup.Value'].events,
      label: rowLabel,
    },
  ),
  'FieldGroup.Link': defineKitComponent(
    'A row that opens a page or a destination.',
    fieldGroupKitComponents['FieldGroup.Link'].props,
    {
      group: 'fields',
      events: fieldGroupKitComponents['FieldGroup.Link'].events,
      label: rowLabel,
    },
  ),
  'FieldGroup.Toggle': defineKitComponent(
    'A row with an on/off switch.',
    fieldGroupKitComponents['FieldGroup.Toggle'].props,
    {
      group: 'fields',
      events: fieldGroupKitComponents['FieldGroup.Toggle'].events,
      label: rowLabel,
    },
  ),
  'FieldGroup.Picker': defineKitComponent(
    'A row that chooses one option.',
    fieldGroupKitComponents['FieldGroup.Picker'].props,
    {
      group: 'fields',
      events: fieldGroupKitComponents['FieldGroup.Picker'].events,
      label: rowLabel,
    },
  ),
  'FieldGroup.DatePicker': defineKitComponent(
    'A row that picks a date, a time, or both.',
    fieldGroupKitComponents['FieldGroup.DatePicker'].props,
    {
      group: 'fields',
      events: fieldGroupKitComponents['FieldGroup.DatePicker'].events,
      label: rowLabel,
    },
  ),
  'FieldGroup.Slider': defineKitComponent(
    'A row with a numeric range control.',
    fieldGroupKitComponents['FieldGroup.Slider'].props,
    {
      group: 'fields',
      events: fieldGroupKitComponents['FieldGroup.Slider'].events,
      label: rowLabel,
    },
  ),
  'FieldGroup.TextField': defineKitComponent(
    'A row with a text field; a number uses a numeric keyboard.',
    fieldGroupKitComponents['FieldGroup.TextField'].props,
    {
      group: 'fields',
      events: fieldGroupKitComponents['FieldGroup.TextField'].events,
      label: rowLabel,
    },
  ),
  'FieldGroup.SecretField': defineKitComponent(
    'A row with a text field that hides what is typed.',
    fieldGroupKitComponents['FieldGroup.SecretField'].props,
    {
      group: 'fields',
      events: fieldGroupKitComponents['FieldGroup.SecretField'].events,
      label: rowLabel,
    },
  ),
} as const;
