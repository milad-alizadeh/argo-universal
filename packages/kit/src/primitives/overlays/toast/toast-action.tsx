import { toast as sonner } from 'sonner';
import { Icon } from '#primitives/content/icon';
import type { Toast, ToastAction } from './toast';

// An action's toast stays 4 seconds: long enough to press Undo, inside the Server's 5-second window.
const actionToastMilliseconds = 4000;

/*
 * Burnt's web toast takes no button, so a toast with an action goes to sonner, the library under
 * Burnt's Toaster; the Toaster draws it like every other toast. Returns whether it drew the toast.
 */
export function showActionToast(toast: Toast, action: ToastAction): boolean {
  const show = toast.tone === 'success' ? sonner.success : sonner.error;

  show(toast.title, {
    description: toast.message,
    icon: <ToneIcon tone={toast.tone} />,
    action: { label: action.label, onClick: action.onPress },
    duration: actionToastMilliseconds,
  });

  return true;
}

const toneIcons = { success: 'check', danger: 'close' } as const;

const ToneIcon = ({ tone }: Pick<Toast, 'tone'>): React.JSX.Element => (
  <Icon name={toneIcons[tone]} size="sm" tone={tone} />
);
