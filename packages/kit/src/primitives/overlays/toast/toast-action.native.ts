// The phones' system toasts cannot hold a button, so a toast with an action shows as a plain one.
export function showActionToast(): boolean {
  return false;
}
