import type { ReactElement } from 'react';
import { BareTextInput } from './text-input-bare';
import type { TextInputProps } from './text-input-props';
import { RowTextInput } from './text-input-row';
import { StandaloneTextInput } from './text-input-standalone';

/*
 * One text field in three variants: on its own (the default), as a row inside a
 * List.Section, or the bare box for a caller that lays out its own label. Each
 * variant resolves its iOS, Android or web drawing from its own platform files.
 */
export function TextInput(props: TextInputProps): ReactElement {
  if (props.variant === 'bare') return <BareTextInput {...props} />;

  if (props.variant === 'row') return <RowTextInput {...props} />;

  return <StandaloneTextInput {...props} />;
}

export type {
  StandaloneTextInputProps,
  TextInputProps,
} from './text-input-props';
