import type { ScreenCaptureAnswer } from '@repo/contracts/operations';
import { useMutation } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useEffect } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import { loadScreenSightEnabled, tellDesktop } from './screen-sight-preference';

const bridge = (): Window['argo'] => globalThis.window?.argo;

// Only the desktop App's preload makes this a desktop App; the Server asks no other App to capture.
const isDesktopApp = (): boolean =>
  typeof bridge()?.links?.onOpen === 'function';

// The desktop App takes its own picture, through its preload; a page without one cannot capture.
const screenBridge = (): NonNullable<Window['argo']>['screen'] =>
  bridge()?.screen;

const capture = (): Promise<ScreenCaptureAnswer> =>
  screenBridge()?.capture() ??
  Promise.resolve({
    status: 'not_available',
    reason: 'This App has no way to capture the screen.',
  });

// Takes one capture and answers the request with it; the desktop App refuses it itself unless this Device turned screen sight on.
function useAnswer(): (requestId: string) => Promise<void> {
  const trpc = useTRPC();
  const { mutate } = useMutation(trpc.screenSight.answer.mutationOptions());

  return async (requestId) => mutate({ requestId, answer: await capture() });
}

/*
 * The desktop App answers the Server's requests for a picture of the screen (ADR-0064): it takes one capture for each,
 * and its main process refuses it unless this Device turned screen sight on.
 */
export function useScreenSight(): void {
  const trpc = useTRPC();
  const answer = useAnswer();

  // The desktop App starts off; it hears this Device's saved setting as soon as the App is up.
  useEffect(() => {
    if (isDesktopApp()) void loadScreenSightEnabled().then(tellDesktop);
  }, []);

  const subscription = useSubscription({
    ...trpc.screenSight.requests.subscriptionOptions(),
    enabled: isDesktopApp(),
    onData: (event) => event.type === 'capture' && void answer(event.requestId),
  });

  useResubscribeOnReconnect(subscription);
}
