import type {
  ChartPreviewAnswer,
  ChartPreviewDraft,
} from '@repo/contracts/operations/chart';
import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import { createTRPCClient, createWSClient, wsLink } from '@trpc/client';
import { onTestFinished } from 'vitest';
import type { AppRouter } from '../src/engine/router';
import { AppPageSocket } from './app-socket';

export const chartPreviewImage = {
  mimeType: 'image/png',
  data: 'iVBORw0KGgo=',
} as const;

const captured: ChartPreviewAnswer = {
  status: 'captured',
  image: chartPreviewImage,
};

type ChartPreviewApp = {
  ready: Promise<void>;
  drafts: ChartPreviewDraft[];
};

export function connectChartPreviewApp(
  url: string,
  answer: ChartPreviewAnswer = captured,
): ChartPreviewApp {
  const socket = createWSClient({
    url: url.replace('http:', 'ws:'),
    connectionParams: {
      pluginSurface: JSON.stringify(currentPluginSurface('desktop')),
    },
    WebSocket: AppPageSocket,
  });
  const app = createTRPCClient<AppRouter>({
    links: [wsLink({ client: socket })],
  });

  const ready = Promise.withResolvers<void>();

  const drafts: ChartPreviewDraft[] = [];

  const listener = app.chartPreview.requests.subscribe(undefined, {
    onData: (event) => {
      if (event.type === 'ready') return ready.resolve();

      drafts.push(event.draft);
      void app.chartPreview.answer.mutate({
        requestId: event.requestId,
        answer,
      });
    },
    onError: ready.reject,
  });

  onTestFinished(async () => {
    listener.unsubscribe();
    await socket.close();
  });

  return { ready: ready.promise, drafts };
}
