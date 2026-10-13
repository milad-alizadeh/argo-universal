import { useRef, useEffect, type ReactElement } from 'react';
import { BottomSheet } from '#primitives/overlays/bottom-sheet/bottom-sheet';
import { ElicitationForm, type ElicitationFormProps } from './elicitation-form';

export function ElicitationSheet(props: ElicitationFormProps): ReactElement {
  const dismissed = useRef(false);
  useEffect(() => {
    dismissed.current = false;
  }, [props.request.requestId, props.error]);
  const dismissible = props.state.kind === 'open';
  const dismiss = (open: boolean): void => {
    if (open || !dismissible || dismissed.current) return;
    dismissed.current = true;
    props.onAnswer({ action: 'cancel' });
  };
  return (
    <BottomSheet
      open
      fit
      size="form"
      label={props.request.message}
      dismissible={dismissible}
      onOpenChange={dismiss}
    >
      <ElicitationForm {...props} />
    </BottomSheet>
  );
}
