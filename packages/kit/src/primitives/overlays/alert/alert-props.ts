import {
  declaredActions,
  type PressActionProps,
} from '#primitives/actions/action-list';
import type { KitProps } from '../../kit-props';

// One answer is an Action. Argo's own callers pass answers as data; a Plugin declares them as Action children.
export type AlertAction = Pick<PressActionProps, 'label'> &
  Partial<Pick<PressActionProps, 'onPress' | 'disabled' | 'tone' | 'role'>> & {
    loading?: boolean;
  };

// Kit-only: `actions` for Argo's own callers.
export type AlertProps = KitProps<'Alert'> & {
  actions?: readonly AlertAction[];
};

// What every platform draws: the answers, whichever way they were given.
export type AnsweredAlertProps = Omit<AlertProps, 'actions' | 'children'> & {
  actions: readonly AlertAction[];
};

export function answeredAlert({
  actions,
  children,
  ...props
}: AlertProps): AnsweredAlertProps {
  return { ...props, actions: actions ?? declaredActions(children) };
}

export const isCancel = (action: AlertAction): boolean =>
  action.role === 'cancel';

export const isDestructive = (action: AlertAction): boolean =>
  action.role === 'destructive' || action.tone === 'danger';

// Every answer runs, then closes the alert: a Plugin hears the answer before the close that may remove it.
export function alertActionPress(
  action: AlertAction,
  onOpenChange: AnsweredAlertProps['onOpenChange'],
): () => void {
  return () => {
    action.onPress?.();
    onOpenChange(false);
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
  props: Pick<AnsweredAlertProps, 'actions' | 'onOpenChange'>,
): AnsweredAlertProps['onOpenChange'] {
  return (open) => {
    if (open || !isAlertBusy(props.actions)) props.onOpenChange(open);
  };
}
