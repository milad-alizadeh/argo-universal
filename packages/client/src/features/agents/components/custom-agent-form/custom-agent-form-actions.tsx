import { useStore } from '@tanstack/react-form';
import type * as React from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/buttons/button';
import { GroupedListContent } from '#primitives/lists/grouped-list-content';
import type { FormPartProps } from './custom-agent-form-sections';

export type ActionProps = FormPartProps & {
  submitLabel: string;
  onCancel: () => void;
};

/*
 * The form's foot row. A phone leaves Cancel to the header's Back and gives the form one full-width action.
 * GroupedList takes it as a direct child, so this is called rather than rendered.
 */
export function formActions(
  props: ActionProps & { wide: boolean },
): React.JSX.Element {
  return (
    <GroupedListContent key="actions">
      <View className="items-stretch gap-2 wide:flex-row wide:justify-end">
        {props.wide && (
          <CancelButton disabled={props.disabled} onPress={props.onCancel} />
        )}
        <SubmitButton {...props} />
      </View>
    </GroupedListContent>
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

function SubmitButton(props: ActionProps): React.JSX.Element {
  const canSubmit = useStore(props.form.store, (state) => state.canSubmit);

  return (
    <Button
      size="sm"
      fullWidth="narrow"
      disabled={props.disabled || !canSubmit}
      onPress={() => void props.form.handleSubmit()}
      label={props.disabled ? 'Checking…' : props.submitLabel}
    />
  );
}
