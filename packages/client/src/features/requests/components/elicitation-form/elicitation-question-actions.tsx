import type { ReactElement } from 'react';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import {
  Button,
  type ButtonProps,
} from '#primitives/buttons/button/button-view';
import type { QuestionModel } from '../../hooks/use-elicitation-questions';

type ActionProps = Extract<ButtonProps, { appearance: 'content' }>;

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
): [ActionProps, ActionProps] {
  const submit = submitProps(model, wide);
  const skip = skipProps(model, wide);

  return wide ? [skip, submit] : [submit, skip];
}

function actionProps(
  wide: boolean,
): Pick<ActionProps, 'appearance' | 'size' | 'fullWidth'> {
  return { appearance: 'content', size: 'sm', fullWidth: !wide };
}

function submitProps(model: QuestionModel, wide: boolean): ActionProps {
  return {
    ...actionProps(wide),
    label: actionLabel(model),
    disabled: model.inactive || !model.canAdvance,
    loading: model.props.state.kind === 'submitting',
    onPress: model.advance,
    className: cn('android:min-h-12', wide && 'px-3.5'),
  };
}

function skipProps(model: QuestionModel, wide: boolean): ActionProps {
  return {
    ...actionProps(wide),
    label: 'Skip',
    variant: wide ? 'ghost' : 'outline',
    disabled: model.inactive,
    className: 'android:min-h-12 android:border-neutral-500',
    onPress: model.skip,
  };
}

function actionLabel(model: QuestionModel): string {
  if (model.props.state.kind === 'submitting') return 'Sending…';

  return model.last ? 'Submit' : 'Next';
}
