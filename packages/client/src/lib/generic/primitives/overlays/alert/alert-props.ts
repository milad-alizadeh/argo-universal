import type { KitProps } from '../../kit-props';

export type AlertProps = KitProps<'Alert'>;

export type AlertAction = AlertProps['actions'][number];

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

// An answer takes a press only while it is enabled and no answer is running.
export function isAlertActionEnabled(
  action: AlertAction,
  actions: readonly AlertAction[],
): boolean {
  return !action.disabled && !isAlertBusy(actions);
}

// A running alert ignores the system's requests to close it: Escape, the scrim, Android Back.
export function ignoreCloseWhileBusy(
  props: Pick<AlertProps, 'actions' | 'onOpenChange'>,
): AlertProps['onOpenChange'] {
  return (open) => {
    if (open || !isAlertBusy(props.actions)) props.onOpenChange(open);
  };
}
