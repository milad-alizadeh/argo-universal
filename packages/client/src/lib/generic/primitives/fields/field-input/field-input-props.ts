import type { FieldErrors } from '../field-errors';

// A text field in a section row; on iOS and the web its hint and its error sit in the section's footer.
export interface FieldInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  // An example value shown while the field is empty, so it reads as a place to type.
  placeholder?: string;
  // Any error marks the field invalid; the section's footer, or Android's line under the field, says what is wrong.
  errors?: FieldErrors;
  // What to type, under the field on Android while it has no error; iOS and the web say it in the section's footer.
  hint?: string;
  // Code, such as a path or a command, draws in the mono face.
  mono?: boolean;
  disabled?: boolean;
}
