import type { ComponentType, ReactElement } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { useInCentredOverlay } from '#primitives/overlays/centred-overlay';
import { DialogFooter } from '#primitives/overlays/dialog';
import { FormFocusScope } from '../../../form-focus';
import { FormFields } from './form-fields';
import type { FormProps } from './form-props';

/*
 * Stacked fields, then the one submit Button at the bottom (ADR-0033): the trailing footer
 * with Cancel in a centred dialog, a full-width Button on phones and in sheets.
 */
export function Form(props: FormProps): ReactElement {
  const submit = (): void => {
    if (!props.loading) props.onSubmit();
  };

  return (
    <FormFocusScope>
      <View className="gap-6">
        <FormFields locked={!!props.loading} onShortcut={submit}>
          {props.children}
        </FormFields>
        <FormFooter {...props} submit={submit} />
      </View>
    </FormFocusScope>
  );
}

function FormFooter(props: FormProps & { submit: () => void }): ReactElement {
  const centred = useInCentredOverlay();

  return (
    <DialogFooter>
      {centred ? <CancelButton {...props} /> : null}
      <Button
        label={props.submitLabel}
        disabled={props.loading}
        fullWidth={!centred}
        onPress={props.submit}
      />
    </DialogFooter>
  );
}

// Only a centred dialog draws Cancel; sheets and phone screens dismiss natively.
function CancelButton(props: FormProps): ReactElement | null {
  if (!props.onCancel) return null;

  return (
    <Button
      variant="secondary"
      label={props.cancelLabel ?? 'Cancel'}
      disabled={props.loading}
      onPress={props.onCancel}
    />
  );
}

Form satisfies ComponentType<FormProps>;
