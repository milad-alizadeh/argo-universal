import type { ReactElement } from 'react';
import { Button, type ButtonProps } from '#primitives/buttons/button/button';
import type { ElicitationModel } from '../../hooks/use-elicitation-form';

const refusals = {
  decline: { label: 'Decline', variant: 'outline' },
  cancel: { label: 'Dismiss', variant: 'ghost' },
} as const;

export function ElicitationActions({
  model,
}: {
  model: ElicitationModel;
}): ReactElement {
  return (
    <>
      <Button {...submitProps(model)} />
      <Button {...refusalProps(model, 'decline')} />
      <Button {...refusalProps(model, 'cancel')} />
    </>
  );
}

function refusalProps(
  model: ElicitationModel,
  action: keyof typeof refusals,
): ButtonProps {
  return {
    ...refusals[action],
    fullWidth: true,
    disabled: model.inactive,
    onPress: (): void => model.answer(action),
  };
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
