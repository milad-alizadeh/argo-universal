import type { ReactElement } from 'react';
import { useContentWide } from '#lib/product/content-layout';
import { Button, type ButtonProps } from '#primitives/buttons/button';
import type { QuestionModel } from '../../hooks/use-elicitation-questions';

export function QuestionActions({
  model,
}: {
  model: QuestionModel;
}): ReactElement {
  const wide = useContentWide();
  const [first, second] = actionOrder(model, wide);

  return (
    <>
      <Button {...first} />
      <Button {...second} />
    </>
  );
}

function actionOrder(
  model: QuestionModel,
  wide: boolean,
): [ButtonProps, ButtonProps] {
  const submit = submitProps(model, wide);
  const skip = skipProps(model, wide);

  return wide ? [skip, submit] : [submit, skip];
}

function actionProps(wide: boolean): Pick<ButtonProps, 'size' | 'fullWidth'> {
  return { size: 'sm', fullWidth: !wide };
}

function submitProps(model: QuestionModel, wide: boolean): ButtonProps {
  return {
    ...actionProps(wide),
    label: actionLabel(model),
    disabled: model.inactive || !model.canAdvance,
    loading: model.props.state.kind === 'submitting',
    onPress: model.advance,
  };
}

function skipProps(model: QuestionModel, wide: boolean): ButtonProps {
  return {
    ...actionProps(wide),
    label: 'Skip',
    variant: wide ? 'ghost' : 'outline',
    disabled: model.inactive,
    onPress: model.skip,
  };
}

function actionLabel(model: QuestionModel): string {
  if (model.props.state.kind === 'submitting') return 'Sending…';

  return model.last ? 'Submit' : 'Next';
}
