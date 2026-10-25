import { wireParts } from '../wire-parts';

export const fieldsPartSchemas = {
  FieldGroup: wireParts.FieldGroup,
  'FieldGroup.Section': wireParts['FieldGroup.Section'],
  'FieldGroup.Value': wireParts['FieldGroup.Value'],
  'FieldGroup.Link': wireParts['FieldGroup.Link'],
  'FieldGroup.Toggle': wireParts['FieldGroup.Toggle'],
  'FieldGroup.Picker': wireParts['FieldGroup.Picker'],
  'FieldGroup.DatePicker': wireParts['FieldGroup.DatePicker'],
  'FieldGroup.Slider': wireParts['FieldGroup.Slider'],
  'FieldGroup.TextField': wireParts['FieldGroup.TextField'],
  'FieldGroup.SecretField': wireParts['FieldGroup.SecretField'],
};
