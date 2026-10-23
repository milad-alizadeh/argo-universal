import { FieldLink } from '#primitives/fields/field-link';
import { FieldPicker } from '#primitives/fields/field-picker';
import { FieldSlider } from '#primitives/fields/field-slider';
import { FieldSecret, FieldText } from '#primitives/fields/field-text';
import { FieldToggle } from '#primitives/fields/field-toggle';
import { FieldValue } from '#primitives/fields/field-value';

// The rows a FieldGroup offers as FieldGroup.<Name>; each platform's FieldGroup adds its own Section.
export const fieldGroupRowComponents = {
  Value: FieldValue,
  Link: FieldLink,
  Toggle: FieldToggle,
  Picker: FieldPicker,
  Slider: FieldSlider,
  TextField: FieldText,
  SecretField: FieldSecret,
};
