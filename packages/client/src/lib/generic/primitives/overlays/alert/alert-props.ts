import type { ReactNode } from 'react';
import { actionGroups } from '#primitives/actions/action-list';
import type { KitProps } from '../../kit-props';

// One answer. Argo's own callers pass answers as data; a Plugin declares them as Action children.
export type AlertAction = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  cancel?: boolean;
  tone?: 'danger';
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
  return { ...props, actions: actions ?? declaredAnswers(children) };
}

function declaredAnswers(children: ReactNode): AlertAction[] {
  return actionGroups(children).flatMap((group) =>
    group.actions.map(({ label, tone, role, disabled, onPress }) => ({
      label,
      tone: role === 'destructive' ? 'danger' : tone,
      cancel: role === 'cancel',
      disabled,
      onPress,
    })),
  );
}

// Every answer closes the alert before it runs, so the action may open something else.
export function alertActionPress(
  action: AlertAction,
  onOpenChange: AnsweredAlertProps['onOpenChange'],
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
  props: Pick<AnsweredAlertProps, 'actions' | 'onOpenChange'>,
): AnsweredAlertProps['onOpenChange'] {
  return (open) => {
    if (open || !isAlertBusy(props.actions)) props.onOpenChange(open);
  };
}
