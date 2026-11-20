import type {
  ScreenCaptureAnswer,
  ScreenSightStreamEvent,
} from '@repo/contracts/operations';
import {
  currentPluginSurface,
  type PluginSurface,
} from '@repo/contracts/plugins/kit';
import {
  createTRPCClient,
  createWSClient,
  wsLink,
  type TRPCClient,
} from '@trpc/client';
import { onTestFinished } from 'vitest';
import type { AppRouter } from '../src/engine/router';
import { AppPageSocket } from './app-socket';

type CaptureRequest = Extract<ScreenSightStreamEvent, { type: 'capture' }>;

// The pixels a fake App "captures"; a test searches storage for them.
export const capturedImage = {
  mimeType: 'image/png',
  data: 'c2VjcmV0LXBpeGVscw==',
} as const;

export interface ScreenSightApp {
  // The capture requests the Server sent, in order.
  asked: CaptureRequest[];
  ready: Promise<void>;
  close: () => Promise<void>;
}

export interface ScreenSightAppOptions {
  surface?: Partial<PluginSurface>;
  // Whether the person turned screen sight on for this Device.
  enabled?: boolean;
  // What the App answers each request with; a picture by default.
  answer?: (request: CaptureRequest) => ScreenCaptureAnswer;
}

const defaults: Required<ScreenSightAppOptions> = {
  surface: currentPluginSurface('desktop'),
  enabled: true,
  answer: () => ({ status: 'captured', image: capturedImage }),
};

const clientOver = (
  socket: ReturnType<typeof createWSClient>,
): TRPCClient<AppRouter> =>
  createTRPCClient<AppRouter>({ links: [wsLink({ client: socket })] });

const socketTo = (
  url: string,
  surface: Partial<PluginSurface>,
): ReturnType<typeof createWSClient> =>
  createWSClient({
    url: url.replace('http:', 'ws:'),
    connectionParams: { pluginSurface: JSON.stringify(surface) },
    WebSocket: AppPageSocket,
  });

interface Listening {
  ready: Promise<void>;
  stop: () => void;
}

type Hearing = {
  client: TRPCClient<AppRouter>;
  options: Required<ScreenSightAppOptions>;
  asked: CaptureRequest[];
  ready: PromiseWithResolvers<void>;
};

// What the App does with each event: note it is listening, or answer the request as a real App would.
const onEvent =
  ({ client, options, asked, ready }: Hearing) =>
  (event: ScreenSightStreamEvent): void => {
    if (event.type === 'ready') return ready.resolve();
    asked.push(event);

    void client.screenSight.answer.mutate({
      requestId: event.requestId,
      answer: options.answer(event),
    });
  };

function listen(
  client: TRPCClient<AppRouter>,
  options: Required<ScreenSightAppOptions>,
  asked: CaptureRequest[],
): Listening {
  const ready = Promise.withResolvers<void>();

  const subscription = client.screenSight.requests.subscribe(
    { enabled: options.enabled },
    {
      onData: onEvent({ client, options, asked, ready }),
      onError: ready.reject,
    },
  );

  return { ready: ready.promise, stop: () => subscription.unsubscribe() };
}

// An App Connection that reports its platform, listens for capture requests and answers them.
export function connectScreenSightApp(
  url: string,
  given: ScreenSightAppOptions = {},
): ScreenSightApp {
  const options = { ...defaults, ...given };
  const socket = socketTo(url, options.surface);
  const asked: CaptureRequest[] = [];
  const { ready, stop } = listen(clientOver(socket), options, asked);

  const close = async (): Promise<void> => {
    stop();
    await socket.close();
  };

  onTestFinished(close);

  return { asked, ready, close };
}
