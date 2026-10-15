import type { ComponentType, ReactElement } from 'react';
import { Field } from '#primitives/fields/field';
import { Host } from '#primitives/native/host';
import { useWide } from '../../../use-wide/use-wide';
import { PhoneField } from './text-input-phone-field';
import type { StandaloneTextInputProps } from './text-input-props';
import { StandaloneTextInput as WideStandaloneTextInput } from './text-input-standalone.tsx';

// The field in its own Host, its hint or error in the footer under it.
export function StandaloneTextInput(
  props: StandaloneTextInputProps,
): ReactElement {
  if (useWide()) return <WideStandaloneTextInput {...props} />;

  return (
    <Field {...props}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <PhoneField {...props} />
      </Host>
    </Field>
  );
}

StandaloneTextInput satisfies ComponentType<StandaloneTextInputProps>;
