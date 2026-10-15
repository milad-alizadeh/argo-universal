// Types only: Metro resolves the .ios and .android drawings, which have no web one.
import type * as React from 'react';
import type { FieldProps } from '#primitives/fields/field';
import type { PhoneFieldProps } from './text-input-props';

export declare function PhoneField(props: PhoneFieldProps): React.JSX.Element;

// iOS says the hint and error in Field's footer; Android's field says them itself.
export declare function PhoneFieldWithFooter(
  props: FieldProps,
): React.ReactNode;
