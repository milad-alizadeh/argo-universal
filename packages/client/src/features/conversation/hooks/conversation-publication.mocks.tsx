import type { AppRouter } from '@repo/engine/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, type TRPCClient, type TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import type { JSX } from 'react';
import { View } from 'react-native';
import {
  ConnectionContext,
  TRPCProvider,
  type Connection,
} from '#features/connection';
import {
  ConversationBand,
  MiniConversationBand,
} from '../components/conversation-band/conversation-band';
import { sessionConversation } from '../utils/session-conversation';
import {
  callIn,
  inputOf,
  statusOf,
} from '../utils/session-conversation.test.mocks';
import { useConversationStatus } from './use-conversation-status';
import { useListedConversation } from './use-listed-conversation';

const sessionId = 'session-1';

const noop = (): void => {};

const connection: Connection = {
  state: () => 'open',
  subscribe: () => noop,
  nextAttempt: () => Promise.resolve(),
  watch: noop,
  foreground: noop,
  retry: noop,
  refuse: noop,
  stop: noop,
};

interface ConversationPublication {
  queryClient: QueryClient;
  client: TRPCClient<AppRouter>;
  reading: Promise<void>;
  publish: () => void;
}

export function conversationPublication(): ConversationPublication {
  const publish = Promise.withResolvers<void>();
  const reading = Promise.withResolvers<void>();
  const { availability: _availability, ...idle } = statusOf(null);

  const conversation = callIn(sessionId, {
    status: 'connecting',
    state: 'none',
    startedAt: null,
  });

  const link: TRPCLink<AppRouter> =
    () =>
    ({ op }) =>
      observable((observer) => {
        if (op.path === 'conversation.status') {
          reading.resolve();

          return;
        }

        if (op.path !== 'conversation.updates') {
          throw new Error(`Unexpected request: ${op.path}`);
        }

        observer.next({ result: { type: 'data', data: idle } });
        void publish.promise.then(() => {
          observer.next({
            result: { type: 'data', data: { ...idle, conversation } },
          });
        });
      });

  return {
    queryClient: new QueryClient(),
    client: createTRPCClient<AppRouter>({ links: [link] }),
    reading: reading.promise,
    publish: publish.resolve,
  };
}

function ConversationIndicators(): JSX.Element {
  const status = useConversationStatus();
  const { band } = sessionConversation(inputOf(status, sessionId));
  const listed = useListedConversation();

  return (
    <>
      {band && <ConversationBand {...band} />}
      {listed && (
        <View testID="listed-conversation">
          <MiniConversationBand {...listed.band} />
        </View>
      )}
    </>
  );
}

export function ConversationPublicationPreview({
  fixture,
}: {
  fixture: ConversationPublication;
}): JSX.Element {
  return (
    <ConnectionContext.Provider value={connection}>
      <QueryClientProvider client={fixture.queryClient}>
        <TRPCProvider
          trpcClient={fixture.client}
          queryClient={fixture.queryClient}
        >
          <ConversationIndicators />
        </TRPCProvider>
      </QueryClientProvider>
    </ConnectionContext.Provider>
  );
}
