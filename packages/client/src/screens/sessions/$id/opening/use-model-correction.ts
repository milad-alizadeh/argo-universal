import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import type { useSessionFeed } from '#features/feed';
import {
  modelCorrectionToast,
  type EmptySessionConfiguration,
} from '#features/sessions';

type Snapshot = ReturnType<typeof useSessionFeed>['snapshot'];

// Tells the reader when the Agent runs a different model from the one they chose before Send.
export function useModelCorrection(
  { initial }: EmptySessionConfiguration,
  snapshot: Snapshot,
): void {
  const live = snapshot?.configOptions ?? [];

  useErrorToast(modelCorrectionToast(initial, live));
}
