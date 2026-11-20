import { useMutation } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import { browserScreenCapture } from './browser-screen-capture';
import { captureScreen } from './capture-screen';
import { useScreenSightEnabled } from './screen-sight-preference';

const bridge = (): Window['argo'] => globalThis.window?.argo;

// Only the desktop App's preload makes this a desktop App; the Server asks no other App to capture.
const isDesktopApp = (): boolean =>
  typeof bridge()?.links?.onOpen === 'function';

// Takes one capture through the system's display prompt and answers the request with it.
function useAnswer(): (requestId: string) => Promise<void> {
  const trpc = useTRPC();
  const { mutate } = useMutation(trpc.screenSight.answer.mutationOptions());

  return async (requestId) =>
    mutate({ requestId, answer: await captureScreen(browserScreenCapture) });
}

/*
 * The desktop App answers the Server's requests for a picture of the screen (ADR-0064): it reports whether this Device
 * turned screen sight on, and takes one capture for each request.
 */
export function useScreenSight(): void {
  const trpc = useTRPC();
  const { enabled } = useScreenSightEnabled();
  const answer = useAnswer();

  const subscription = useSubscription({
    ...trpc.screenSight.requests.subscriptionOptions({ enabled }),
    enabled: isDesktopApp(),
    onData: (event) => event.type === 'capture' && void answer(event.requestId),
  });

  useResubscribeOnReconnect(subscription);
}
