import type { ReactElement, ReactNode } from 'react';
import { Field } from '#primitives/fields/field';
import { Host } from '#primitives/native/host';
import { useWide } from '../../../use-wide/use-wide';
import type { StandaloneTextInputProps } from './text-input-props';
import { StandaloneTextInput as WebField } from './text-input-standalone.tsx';

export function StandaloneNativeField({
  children,
  ...props
}: StandaloneTextInputProps & { children: ReactNode }): ReactElement {
  if (useWide()) return <WebField {...props} />;

  return (
    <Field {...props}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        {children}
      </Host>
    </Field>
  );
}
