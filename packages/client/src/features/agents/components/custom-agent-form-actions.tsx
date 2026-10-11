import { useStore } from '@tanstack/react-form';
import type * as React from 'react';
import { View } from 'react-native';
import { Button } from '../../../lib/generic/primitives/button';
import { useWide } from '../../../lib/generic/use-wide';
import type { FormPartProps } from './custom-agent-form-sections';

export type ActionProps = FormPartProps & {
  submitLabel: string;
  onCancel: () => void;
};

// A phone leaves Cancel to the header's Back and gives the form one full-width action.
export function FormActions(props: ActionProps): React.JSX.Element {
  if (!useWide()) return <SubmitButton {...props} fullWidth />;
  return (
    <View className="flex-row justify-end gap-2">
      <CancelButton disabled={props.disabled} onPress={props.onCancel} />
      <SubmitButton {...props} />
    </View>
  );
}

type CancelProps = { disabled: boolean; onPress: () => void };

function CancelButton({ disabled, onPress }: CancelProps): React.JSX.Element {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      onPress={onPress}
      label={'Cancel'}
    />
  );
}

function SubmitButton(
  props: ActionProps & { fullWidth?: boolean },
): React.JSX.Element {
  const canSubmit = useStore(props.form.store, (state) => state.canSubmit);
  return (
    <Button
      size="sm"
      fullWidth={props.fullWidth}
      disabled={props.disabled || !canSubmit}
      onPress={() => void props.form.handleSubmit()}
      label={props.disabled ? 'Checking…' : props.submitLabel}
    />
  );
}
