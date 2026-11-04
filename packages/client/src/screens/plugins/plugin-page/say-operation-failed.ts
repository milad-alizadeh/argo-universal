import { errorToast } from '@repo/kit/error-toast';
import { showToast } from '@repo/kit/primitives/overlays/toast';

// An Operation a Plugin tree's press ran failed: its toast says why, and the press settles.
export function sayOperationFailed(error: Error): void {
  const toast = errorToast('That did not work', error);

  if (toast) showToast({ ...toast, tone: 'danger' });
}
