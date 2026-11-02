import type { Tone } from '#primitives/content/text';
import type { FieldGroupKitProps } from '../../kit-props';

// Kit-only: a state dot before the value, coloured by the tone while the value's words stay muted.
export type FieldValueProps = FieldGroupKitProps<'FieldGroup.Value'> & {
  dot?: Tone;
};
