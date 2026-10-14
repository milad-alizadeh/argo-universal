import type { ReactElement, ReactNode } from 'react';
import { useWide } from '../../../use-wide/use-wide';
import { StandaloneField } from '../../fields/standalone-field';
import { Host } from '../../native/host';
import type { StandaloneTextInputProps } from './text-input-props';
import { StandaloneTextInput as WebField } from './text-input-standalone.tsx';

export function StandaloneNativeField({
  children,
  ...props
}: StandaloneTextInputProps & { children: ReactNode }): ReactElement {
  if (useWide()) return <WebField {...props} />;

  return (
    <StandaloneField {...props}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        {children}
      </Host>
    </StandaloneField>
  );
}
