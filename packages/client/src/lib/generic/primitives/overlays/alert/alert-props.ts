interface AlertActionBase {
  label: string;
  onPress?: () => void;
  // Shown but not pressable, such as an answer the current state does not allow.
  disabled?: boolean;
  /*
   * The answer is running, such as a removal: the alert shows progress, takes no answer and cannot be
   * dismissed. It stays up while the caller keeps `open` set. iOS alerts close before their action runs,
   * so iOS hides the alert instead and the screen shows the progress.
   */
  loading?: boolean;
}

// A cancel action dismisses. iOS drops the red of a cancel action, so cancel and danger never meet.
interface CancelAlertAction extends AlertActionBase {
  cancel: true;
  tone?: never;
}

interface AnswerAlertAction extends AlertActionBase {
  cancel?: false;
  // The danger tone draws the action in red.
  tone?: 'danger';
}

export type AlertAction = CancelAlertAction | AnswerAlertAction;

/*
 * A short question with a few answers, drawn by the system: a centred SwiftUI alert on iOS,
 * a Material 3 AlertDialog on Android, a centred dialog on the web. Forms and longer content use Dialog.
 */
export interface AlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message?: string;
  actions: readonly AlertAction[];
}

// Every answer closes the alert before it runs, so the action may open something else.
export function alertActionPress(
  action: AlertAction,
  onOpenChange: AlertProps['onOpenChange'],
): () => void {
  return () => {
    onOpenChange(false);
    action.onPress?.();
  };
}

export function isAlertBusy(actions: readonly AlertAction[]): boolean {
  return actions.some((action) => action.loading);
}

// An answer runs only while it is enabled and no answer is running.
export function isAlertActionEnabled(
  action: AlertAction,
  actions: readonly AlertAction[],
): boolean {
  return !action.disabled && !isAlertBusy(actions);
}

// A running alert ignores the system's requests to close it: Escape, the scrim, Android Back.
export function alertDismissal(
  props: Pick<AlertProps, 'actions' | 'onOpenChange'>,
): AlertProps['onOpenChange'] {
  return (open) => {
    if (open || !isAlertBusy(props.actions)) props.onOpenChange(open);
  };
}
