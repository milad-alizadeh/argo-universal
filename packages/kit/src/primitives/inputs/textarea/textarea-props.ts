import type { ComponentProps, RefAttributes } from 'react';
import type { TextInput } from 'react-native';
import type { KitProps } from '../../kit-props';

// Kit-only: native entry attributes and reference.
export interface TextareaProps
  extends
    Omit<
      ComponentProps<typeof TextInput>,
      'editable' | keyof KitProps<'Textarea'>
    >,
    RefAttributes<TextInput>,
    KitProps<'Textarea'> {}
