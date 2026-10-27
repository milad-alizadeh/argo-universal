import { fieldGroupKitParts } from '../field-group-kit-props';
import { part } from '../part';

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

export const fieldsParts = {
  FieldGroup: part(
    'A page’s fixed rows of values and controls, arranged in sections.',
    fieldGroupKitParts.FieldGroup.props,
    { group: 'fields', children: ['FieldGroup.Section'] as const },
  ),
  'FieldGroup.Section': part(
    'A titled section of FieldGroup rows, with an optional footer.',
    fieldGroupKitParts['FieldGroup.Section'].props,
    { group: 'fields', children: rows },
  ),
  'FieldGroup.Value': part(
    'A read-only value at the end of a row.',
    fieldGroupKitParts['FieldGroup.Value'].props,
    {
      group: 'fields',
      events: fieldGroupKitParts['FieldGroup.Value'].events,
      label: rowLabel,
    },
  ),
  'FieldGroup.Link': part(
    'A row that opens a page or a destination.',
    fieldGroupKitParts['FieldGroup.Link'].props,
    {
      group: 'fields',
      events: fieldGroupKitParts['FieldGroup.Link'].events,
      label: rowLabel,
    },
  ),
  'FieldGroup.Toggle': part(
    'A row with an on/off switch.',
    fieldGroupKitParts['FieldGroup.Toggle'].props,
    {
      group: 'fields',
      events: fieldGroupKitParts['FieldGroup.Toggle'].events,
      label: rowLabel,
    },
  ),
  'FieldGroup.Picker': part(
    'A row that chooses one option.',
    fieldGroupKitParts['FieldGroup.Picker'].props,
    {
      group: 'fields',
      events: fieldGroupKitParts['FieldGroup.Picker'].events,
      label: rowLabel,
    },
  ),
  'FieldGroup.DatePicker': part(
    'A row that picks a date, a time, or both.',
    fieldGroupKitParts['FieldGroup.DatePicker'].props,
    {
      group: 'fields',
      events: fieldGroupKitParts['FieldGroup.DatePicker'].events,
      label: rowLabel,
    },
  ),
  'FieldGroup.Slider': part(
    'A row with a numeric range control.',
    fieldGroupKitParts['FieldGroup.Slider'].props,
    {
      group: 'fields',
      events: fieldGroupKitParts['FieldGroup.Slider'].events,
      label: rowLabel,
    },
  ),
  'FieldGroup.TextField': part(
    'A row with a text field; a number uses a numeric keyboard.',
    fieldGroupKitParts['FieldGroup.TextField'].props,
    {
      group: 'fields',
      events: fieldGroupKitParts['FieldGroup.TextField'].events,
      label: rowLabel,
    },
  ),
  'FieldGroup.SecretField': part(
    'A row with a text field that hides what is typed.',
    fieldGroupKitParts['FieldGroup.SecretField'].props,
    {
      group: 'fields',
      events: fieldGroupKitParts['FieldGroup.SecretField'].events,
      label: rowLabel,
    },
  ),
} as const;
