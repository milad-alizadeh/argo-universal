import type { ReactElement, ReactNode } from 'react';
import { useWide } from '../../../use-wide/use-wide';
import { Host } from '../../native/host';
import { StandaloneField } from './standalone-field';
import type { StandaloneFieldInputProps } from './standalone-field-input-props';
import { StandaloneFieldInput as WebField } from './standalone-field-input.tsx';

export function StandaloneNativeField({
  children,
  ...props
}: StandaloneFieldInputProps & { children: ReactNode }): ReactElement {
  if (useWide()) return <WebField {...props} />;
  return (
    <StandaloneField {...props}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        {children}
      </Host>
    </StandaloneField>
  );
}
