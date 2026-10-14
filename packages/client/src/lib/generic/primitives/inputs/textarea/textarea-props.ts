import type * as React from 'react';
import type { TextInput } from 'react-native';

// React Native's TextInput props, with `disabled` in place of `editable` as every Argo input names it.
export type TextareaProps = Omit<
  React.ComponentProps<typeof TextInput>,
  'editable'
> &
  React.RefAttributes<TextInput> & { disabled?: boolean };
