import type { ReactElement } from 'react';
import { Button, type ButtonProps } from '#primitives/buttons/button/button';
import type { ElicitationModel } from '../../hooks/use-elicitation-form';

export function ElicitationActions({
  model,
}: {
  model: ElicitationModel;
}): ReactElement {
  return (
    <>
      <Button {...submitProps(model)} />
      <Button
        label="Decline"
        fullWidth
        variant="outline"
        disabled={model.inactive}
        onPress={() => model.answer('decline')}
      />
      <Button
        label="Dismiss"
        fullWidth
        variant="ghost"
        disabled={model.inactive}
        onPress={() => model.answer('cancel')}
      />
    </>
  );
}

function submitProps(model: ElicitationModel): ButtonProps {
  return {
    label: model.submitting ? 'Sending…' : 'Submit',
    fullWidth: true,
    loading: model.submitting,
    disabled: model.inactive || !model.isValid,
    onPress: (): void => model.answer('accept'),
  };
}
