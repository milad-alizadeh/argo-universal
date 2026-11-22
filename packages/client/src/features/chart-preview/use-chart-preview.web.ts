import type { ChartPreviewRequest } from '@repo/contracts/operations/chart';
import { useMutation } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';

type CaptureRequest = Extract<ChartPreviewRequest, { type: 'capture' }>;

// Only the desktop preload can create the App's isolated Chart renderer.
export function useChartPreview(): void {
  const trpc = useTRPC();
  const renderer = globalThis.window?.argo?.chartPreview;
  const { mutate } = useMutation(trpc.chartPreview.answer.mutationOptions());

  const capture = async ({
    requestId,
    draft,
  }: CaptureRequest): Promise<void> => {
    if (!renderer) return;

    const answer = await renderer.capture(draft).catch(() => ({
      status: 'unavailable' as const,
      reason: 'The desktop Chart renderer could not capture the preview.',
    }));

    mutate({ requestId, answer });
  };

  const subscription = useSubscription({
    ...trpc.chartPreview.requests.subscriptionOptions(),
    enabled: renderer !== undefined,
    onData: (event) => event.type === 'capture' && void capture(event),
  });

  useResubscribeOnReconnect(subscription);
}
