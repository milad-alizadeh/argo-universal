import { PluginList, PluginManifest } from '@repo/contracts/plugins';
import {
  DrawRequest,
  treeAnswer,
  type DrawAnswer,
} from '@repo/contracts/plugins/page-draw';
import type { WireNode } from '@repo/contracts/plugins/wire';
import type { AppRouter } from '@repo/engine/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, type TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import * as React from 'react';
import { View } from 'react-native';
import {
  ConnectionContext,
  TRPCProvider,
  type Connection,
} from '#features/connection';

// An open Connection that never changes, which is all a page asks of it.
const openConnection: Connection = {
  state: () => 'open',
  subscribe: () => () => undefined,
  nextAttempt: () => Promise.resolve(),
  watch: () => undefined,
  foreground: () => undefined,
  retry: () => undefined,
  refuse: () => undefined,
  stop: () => undefined,
};

export const draftPage = { pluginId: 'tracker', path: '/issues' };

export const loaderError = 'No issues field in the canned answer';

const populatedText = 'Issues list';

const rootOf = (value: string): WireNode => ({
  type: 'Text',
  key: 'title',
  props: { children: value },
  children: [],
  slots: {},
});

const listed = (dev: boolean): PluginList =>
  PluginList.parse({
    plugins: [
      {
        manifest: PluginManifest.parse({
          id: draftPage.pluginId,
          name: 'Tracker',
          version: '1.0.0',
          engines: { argo: '^1.0.0' },
          main: 'index.js',
          icon: { sf: 'ticket', sfFilled: 'ticket.fill' },
          contributes: {
            nav: [{ id: 'issues', title: 'Issues', path: draftPage.path }],
            drafts: [{ page: draftPage.path, states: ['populated', 'error'] }],
          },
        }),
        firstParty: true,
        ...(dev && { dev }),
        enabled: true,
        state: 'running',
        hanging: false,
        error: null,
      },
    ],
    errors: [],
  });

// A Loader that draws the issue list, and fails for the error state as a Draft Loader with no canned answer for it does.
function drawn(request: DrawRequest): DrawAnswer {
  if (request.pageState.draftState === 'error')
    return { kind: 'failed', error: loaderError };

  const state = String(request.pageState.draftState ?? 'populated');

  return {
    ...treeAnswer(rootOf(`${populatedText} (${state})`), undefined, undefined),
    pages: 0,
  };
}

function clientOver(
  dev: boolean,
): ReturnType<typeof createTRPCClient<AppRouter>> {
  const link: TRPCLink<AppRouter> = () => (operation) =>
    observable((observer) => {
      const { path, input } = operation.op;

      const data =
        path === 'plugins.draw' ? drawn(DrawRequest.parse(input)) : listed(dev);

      void Promise.resolve().then(() => {
        observer.next({ result: { data } });
        observer.complete();
      });
    });

  return createTRPCClient<AppRouter>({ links: [link] });
}

// A Server that lists one Plugin, dev or not, with a Draft page of two declared states, over which a page of it draws.
export function DraftServer(props: {
  dev: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const [queryClient] = React.useState(() => new QueryClient());
  const [client] = React.useState(() => clientOver(props.dev));

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={client} queryClient={queryClient}>
        <ConnectionContext value={openConnection}>
          <View className="h-[28rem] w-full bg-content">{props.children}</View>
        </ConnectionContext>
      </TRPCProvider>
    </QueryClientProvider>
  );
}
