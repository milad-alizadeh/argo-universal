import { PluginList } from '@repo/contracts/plugins';
import {
  DrawRequest,
  treeAnswer,
  type DrawAnswer,
} from '@repo/contracts/plugins/page-draw';
import type { WireNode } from '@repo/contracts/plugins/wire';
import type { AppRouter } from '@repo/engine/router';
import { createTRPCClient, type TRPCClient, type TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';

const tracker = PluginList.parse({
  plugins: [
    {
      manifest: {
        id: 'tracker',
        name: 'Tracker',
        version: '1.0.0',
        engines: { argo: '>=0.0.0 <2' },
        main: 'index.js',
        icon: { material: 'extension' },
        contributes: {
          nav: [
            { id: 'issues', title: 'Issues', path: '/issues' },
            { id: 'plans', title: 'Plans', path: '/plans' },
          ],
        },
      },
      firstParty: true,
      enabled: true,
      state: 'running',
      hanging: false,
      error: null,
    },
  ],
  errors: [],
});

const nothingSent = Array.of<WireNode>().at(0);

const answerOf = (request: DrawRequest): DrawAnswer => ({
  ...treeAnswer(
    {
      type: 'Screen',
      key: 'screen',
      props: { title: request.path },
      children: [],
      slots: {},
    },
    nothingSent,
    request.known,
  ),
  pages: 1,
});

export interface Server {
  client: TRPCClient<AppRouter>;
  // The `{pluginId, path}` of each draw the Server was asked for, in order.
  draws: string[];
  // Answers the Plugin list that was held pending.
  answerList: () => void;
}

type Reply = (data: PluginList | DrawAnswer) => void;

// A draw is recorded and answered at once; the Plugin list waits on `listing`.
function answered(
  operation: { path: string; input: unknown },
  draws: string[],
  listing: Promise<void>,
): (reply: Reply) => void {
  return (reply) => {
    if (operation.path !== 'plugins.draw')
      return void listing.then(() => reply(tracker));

    const request = DrawRequest.parse(operation.input);

    draws.push(`${request.pluginId} ${request.path}`);
    reply(answerOf(request));
  };
}

// The Server's link: every operation is answered through `answered`, and the result is sent as the Server would.
const linkOver =
  (draws: string[], listing: Promise<void>): TRPCLink<AppRouter> =>
  () =>
  ({ op }) =>
    observable((observer) => {
      answered(
        op,
        draws,
        listing,
      )((data) => {
        observer.next({ result: { data } });
        observer.complete();
      });
    });

// A Server whose Plugin list stays pending until `answerList`, and which records every draw it is asked for.
export function server(): Server {
  const draws: string[] = [];
  const listing = Promise.withResolvers<void>();

  return {
    client: createTRPCClient<AppRouter>({
      links: [linkOver(draws, listing.promise)],
    }),
    draws,
    answerList: listing.resolve,
  };
}
