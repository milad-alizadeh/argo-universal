import type { FieldGroupKitProps } from '../../kit-props';

// A TextField row's props on every platform; a SecretField is one with `secure`.
export type FieldTextProps = FieldGroupKitProps<'FieldGroup.TextField'> & {
  secure?: boolean;
};
