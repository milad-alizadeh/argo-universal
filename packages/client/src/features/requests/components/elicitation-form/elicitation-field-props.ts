import type { ElicitationPropertySchema } from '@repo/contracts';
import type { ElicitationValue } from './elicitation-schema';

export type ElicitationFieldProps = {
  name: string;
  property: ElicitationPropertySchema;
  required: boolean;
  value: ElicitationValue | undefined;
  error?: string;
  showError: boolean;
  onChange: (value: ElicitationValue) => void;
  onBlur: () => void;
  inactive: boolean;
};

const fieldLabel = (
  props: Pick<ElicitationFieldProps, 'name' | 'property'>,
): string => props.property.title ?? props.name;

// A required field's title carries the star the form's validation line names it by.
export const rowTitle = (props: ElicitationFieldProps): string =>
  props.required ? `${fieldLabel(props)} *` : fieldLabel(props);
