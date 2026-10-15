import type { ComponentType, ReactElement } from 'react';
import { Host } from '#primitives/native/host';
import { useWide } from '../../../use-wide/use-wide';
import { PhoneField, PhoneFieldFrame } from './text-input-phone-field';
import type { StandaloneTextInputProps } from './text-input-props';
import { StandaloneTextInput as WideStandaloneTextInput } from './text-input-standalone.tsx';

// The field in its own Host; iOS says its hint or error in the footer under it, Android as the field's supporting text.
export function StandaloneTextInput(
  props: StandaloneTextInputProps,
): ReactElement {
  if (useWide()) return <WideStandaloneTextInput {...props} />;

  return (
    <PhoneFieldFrame {...props}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <PhoneField {...props} />
      </Host>
    </PhoneFieldFrame>
  );
}

StandaloneTextInput satisfies ComponentType<StandaloneTextInputProps>;
