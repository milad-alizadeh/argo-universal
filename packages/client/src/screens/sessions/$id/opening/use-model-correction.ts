import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import type { SessionFeed } from '#features/feed';
import {
  modelCorrectionToast,
  type EmptySessionConfiguration,
} from '#features/sessions';

export function useModelCorrection(
  { initial }: EmptySessionConfiguration,
  snapshot: SessionFeed['snapshot'],
): void {
  const live = snapshot?.configOptions ?? [];

  useErrorToast(modelCorrectionToast(initial, live));
}
