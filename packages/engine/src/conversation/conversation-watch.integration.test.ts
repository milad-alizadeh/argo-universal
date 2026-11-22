import type { Conversation } from '@repo/contracts';
import { expect, it, vi } from 'vitest';
import {
  offer,
  openConversationSession,
  startConversationEngine,
} from '#mocks/conversation-engine';
import { finishSubscription } from '#mocks/list-observation';

it('publishes a starting Conversation while provider availability is pending', async () => {
  const voice = await startConversationEngine();
  const { host, provider } = voice;
  const { sessionId } = await openConversationSession(voice);
  const stream = await host.caller.conversation.updates();
  const watching = stream[Symbol.asyncIterator]();

  expect((await watching.next()).value).toMatchObject({ conversation: null });

  const release = Promise.withResolvers<void>();
  const checking = Promise.withResolvers<void>();
  const availability = provider.availability.bind(provider);

  vi.spyOn(provider, 'availability')
    .mockImplementationOnce(availability)
    .mockImplementation(async () => {
      checking.resolve();
      await release.promise;

      return availability();
    });

  let published: Conversation | null | undefined;

  const connecting = watching.next().then(({ value }) => {
    published = value?.conversation;
  });

  const caller = host.caller.conversation;

  try {
    await caller.start({ sessionId, offer });
    const reading = caller.status();

    try {
      await checking.promise;
      await expect
        .poll(() => published)
        .toMatchObject({
          sessionId,
          status: 'connecting',
        });
    } finally {
      release.resolve();
      await reading;
    }
  } finally {
    release.resolve();
    await connecting;
    await finishSubscription(watching);
  }
});
