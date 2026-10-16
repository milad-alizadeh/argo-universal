import type { ReactElement } from 'react';
import { useContentWide } from '#lib/product/content-layout';
import { Button, type ButtonProps } from '#primitives/buttons/button';

export type ElicitationActionsProps = {
  // Submit on the last page, Next before it.
  last: boolean;
  submitting: boolean;
  inactive: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  onSkip: () => void;
};

// Wide, Skip leads Submit at the card's end; a phone stacks Submit over Skip at full width.
export function ElicitationActions(
  props: ElicitationActionsProps,
): ReactElement {
  const wide = useContentWide();
  const submit = submitProps(props, wide);
  const skip = skipProps(props, wide);
  const [first, second] = wide ? [skip, submit] : [submit, skip];

  return (
    <>
      <Button {...first} />
      <Button {...second} />
    </>
  );
}

function actionProps(wide: boolean): Pick<ButtonProps, 'size' | 'fullWidth'> {
  return { size: 'sm', fullWidth: !wide };
}

function submitProps(
  props: ElicitationActionsProps,
  wide: boolean,
): ButtonProps {
  return {
    ...actionProps(wide),
    label: submitLabel(props),
    disabled: props.inactive || !props.canSubmit,
    loading: props.submitting,
    onPress: props.onSubmit,
  };
}

function skipProps(props: ElicitationActionsProps, wide: boolean): ButtonProps {
  return {
    ...actionProps(wide),
    label: 'Skip',
    variant: wide ? 'ghost' : 'outline',
    disabled: props.inactive,
    onPress: props.onSkip,
  };
}

function submitLabel(props: ElicitationActionsProps): string {
  if (props.submitting) return 'Sending…';

  return props.last ? 'Submit' : 'Next';
}
