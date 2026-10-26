import type { ComponentProps, ReactElement } from 'react';
import { FieldText } from './field-text';

// A secret field is a text field that hides what is typed.
export const FieldSecret = (
  props: ComponentProps<typeof FieldText>,
): ReactElement => <FieldText {...props} secure multiline={false} />;
