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
  // The exact command an answer runs, shown on its own line beneath the message.
  command?: string;
  actions: readonly AlertAction[];
}

// Native alerts draw one text, so the command follows the message there.
export function alertText({
  message,
  command,
}: Pick<AlertProps, 'message' | 'command'>): string | undefined {
  return [message, command].filter(Boolean).join('\n\n') || undefined;
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
