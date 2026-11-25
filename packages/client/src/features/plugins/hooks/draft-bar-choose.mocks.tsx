import { PluginList, PluginManifest } from '@repo/contracts/plugins';
import type { PluginDrafts } from '@repo/contracts/plugins/drafts';
import type { AppRouter } from '@repo/engine/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, TRPCClientError, type TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import * as React from 'react';
import { View } from 'react-native';
import { TRPCProvider } from '#features/connection';
import { PluginTree } from '../../../lib/product/plugin-registry/plugin-registry';
import { issuesTree } from '../components/draft-comment/draft-comment-fixtures';
import { DraftPage } from '../components/draft-page/draft-page';
import { draftComments, type DraftNote } from '../stores/draft-comments';
import type { PageOpening } from '../utils/page-addresses';

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

export type ChooseCall = { path: string; input: unknown };

export type ChooseReply = 'delivered' | 'unavailable' | 'no-session';

const refusals = {
  unavailable: {
    code: 'CONFLICT',
    httpStatus: 409,
    message: 'Region list declares no Variant rows',
  },
  'no-session': {
    code: 'PRECONDITION_FAILED',
    httpStatus: 412,
    message:
      "No Session is drawing tracker's Draft: its Agent runs plugin.draft.show from its Session first.",
  },
} as const;

function chooseRefusal(
  reply: Exclude<ChooseReply, 'delivered'>,
): TRPCClientError<AppRouter> {
  const { message, ...data } = refusals[reply];

  return TRPCClientError.from<AppRouter>({
    error: { code: -32000, message, data },
  });
}

function clientOver(
  withRegions: boolean,
  calls: ChooseCall[],
  reply: ChooseReply,
): ReturnType<typeof createTRPCClient<AppRouter>> {
  const link: TRPCLink<AppRouter> = () => (operation) =>
    observable((observer) => {
      const { path, input } = operation.op;
      calls.push({ path, input });
      void Promise.resolve().then(() => {
        if (path === 'plugin.draft.choose' && reply !== 'delivered') {
          observer.error(chooseRefusal(reply));

          return;
        }

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

export function ChooseBarMock(props: {
  withRegions: boolean;
  calls: ChooseCall[];
  notes?: DraftNote[];
  reply?: ChooseReply;
  commenting?: boolean;
  showPage?: boolean;
}): React.JSX.Element {
  const [queryClient] = React.useState(() => new QueryClient());

  const [client] = React.useState(() =>
    clientOver(props.withRegions, props.calls, props.reply ?? 'delivered'),
  );

  React.useState(() => {
    draftComments.sent(opening);
    draftComments.setCommenting(opening, props.commenting ?? false);

    for (const note of props.notes ?? []) draftComments.save(opening, note);
  });

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={client} queryClient={queryClient}>
        <View
          className={
            props.showPage
              ? 'h-screen w-full bg-content p-6'
              : 'h-96 w-full bg-content'
          }
        >
          <DraftPage opening={opening} error={null}>
            {({ tree }) =>
              props.showPage ? (
                <PluginTree root={issuesTree} draft={tree} />
              ) : null
            }
          </DraftPage>
        </View>
      </TRPCProvider>
    </QueryClientProvider>
  );
}
