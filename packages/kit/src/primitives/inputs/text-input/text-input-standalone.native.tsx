import type { ComponentType, ReactElement } from 'react';
import { Host } from '#primitives/native/host';
import { PhoneField, PhoneFieldWithFooter } from './text-input-phone-field';
import type { StandaloneTextInputProps } from './text-input-props';

export function StandaloneTextInput(
  props: StandaloneTextInputProps,
): ReactElement {
  // The native field at every size class.
  return (
    <PhoneFieldWithFooter {...props}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <PhoneField {...props} />
      </Host>
    </PhoneFieldWithFooter>
  );
}

StandaloneTextInput satisfies ComponentType<StandaloneTextInputProps>;
