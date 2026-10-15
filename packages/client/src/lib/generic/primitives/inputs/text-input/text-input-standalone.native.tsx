import type { ComponentType, ReactElement } from 'react';
import { Host } from '#primitives/native/host';
import { useWide } from '../../../use-wide/use-wide';
import { PhoneField, PhoneFieldWithFooter } from './text-input-phone-field';
import type { StandaloneTextInputProps } from './text-input-props';
import { StandaloneTextInput as WideStandaloneTextInput } from './text-input-standalone.tsx';

export function StandaloneTextInput(
  props: StandaloneTextInputProps,
): ReactElement {
  if (useWide()) return <WideStandaloneTextInput {...props} />;

  return (
    <PhoneFieldWithFooter {...props}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <PhoneField {...props} />
      </Host>
    </PhoneFieldWithFooter>
  );
}

StandaloneTextInput satisfies ComponentType<StandaloneTextInputProps>;
