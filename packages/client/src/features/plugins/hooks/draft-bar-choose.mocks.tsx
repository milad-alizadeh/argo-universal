import { PluginList, PluginManifest } from '@repo/contracts/plugins';
import type { PluginDrafts } from '@repo/contracts/plugins/drafts';
import type { AppRouter } from '@repo/engine/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, type TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import * as React from 'react';
import { View } from 'react-native';
import { TRPCProvider } from '#features/connection';
import { PluginDraftBar } from '../components/draft-bar/plugin-draft-bar';
import type { PageOpening } from '../utils/page-addresses';
import { useDraftBar } from './use-draft-bar';

const opening: PageOpening = { pluginId: 'tracker', path: '/issues' };

const regionsOf = (
  withRegions: boolean,
): Pick<PluginDrafts[number], 'regions'> =>
  withRegions
    ? {
        regions: [
          {
            id: 'header',
            variants: [
              { id: 'compact', name: 'Compact' },
              { id: 'tabs', name: 'Tabs' },
            ],
          },
          { id: 'list', variants: [{ id: 'rows', name: 'Rows' }] },
        ],
      }
    : {};

const listed = (withRegions: boolean): PluginList =>
  PluginList.parse({
    plugins: [
      {
        manifest: PluginManifest.parse({
          id: 'tracker',
          name: 'Tracker',
          version: '1.0.0',
          engines: { argo: '^1.0.0' },
          main: 'index.js',
          icon: { sf: 'ticket', sfFilled: 'ticket.fill' },
          contributes: {
            nav: [{ id: 'issues', title: 'Issues', path: '/issues' }],
            drafts: [
              {
                page: '/issues',
                states: ['populated'],
                ...regionsOf(withRegions),
              },
            ],
          },
        }),
        firstParty: true,
        dev: true,
        enabled: true,
        state: 'running',
        hanging: false,
        error: null,
      },
    ],
    errors: [],
  });

// The bar as a Plugin page draws it.
function BarOf(): React.ReactNode {
  return <PluginDraftBar bar={useDraftBar(opening)} />;
}

export type ChooseCall = { path: string; input: unknown };

// A Server that lists one dev Plugin with a Draft page and records every Operation the bar calls.
function clientOver(
  withRegions: boolean,
  calls: ChooseCall[],
): ReturnType<typeof createTRPCClient<AppRouter>> {
  const link: TRPCLink<AppRouter> = () => (operation) =>
    observable((observer) => {
      const { path, input } = operation.op;
      calls.push({ path, input });
      void Promise.resolve().then(() => {
        observer.next({
          result: {
            data:
              path === 'plugin.list'
                ? listed(withRegions)
                : { sessionId: 'session-1', delivery: 'started' },
          },
        });
        observer.complete();
      });
    });

  return createTRPCClient<AppRouter>({ links: [link] });
}

// The Draft bar a Plugin page draws, over a Server that records what it is asked.
export function ChooseBarMock(props: {
  withRegions: boolean;
  calls: ChooseCall[];
}): React.JSX.Element {
  const [queryClient] = React.useState(() => new QueryClient());

  const [client] = React.useState(() =>
    clientOver(props.withRegions, props.calls),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={client} queryClient={queryClient}>
        <View className="h-96 w-full bg-content">
          <BarOf />
        </View>
      </TRPCProvider>
    </QueryClientProvider>
  );
}
