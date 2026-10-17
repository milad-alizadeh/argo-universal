import { showSystemToast, type Toast } from './toast';

// The phones' system toasts cannot hold a button, so the toast shows without its action.
export function showActionToast(toast: Toast): void {
  showSystemToast(toast);
}
