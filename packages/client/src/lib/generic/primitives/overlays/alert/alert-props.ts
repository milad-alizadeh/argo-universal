export interface AlertAction {
  label: string;
  // A cancel action dismisses; a destructive one is drawn in red.
  role?: 'cancel' | 'destructive';
  onPress?: () => void;
}

/*
 * A short question with a few answers, drawn by the system: a SwiftUI alert or confirmation dialog on iOS,
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

export function isDestructiveAlert(actions: readonly AlertAction[]): boolean {
  return actions.some((action) => action.role === 'destructive');
}
