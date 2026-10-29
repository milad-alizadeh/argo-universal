import { FeedSubscribeOutput, type FeedPageOutput } from '@repo/contracts';
import type { RuntimeClient } from './runtime-client.mts';
import { runtimeError } from './runtime-error.mts';
import type { RuntimeWatch } from './runtime-watch.mts';

interface RuntimeSubscription {
  page: FeedPageOutput;
  watch: RuntimeWatch;
  sessionId: string;
}

export async function subscribeRuntime(
  client: RuntimeClient,
  { page, watch, sessionId }: RuntimeSubscription,
): Promise<{ watch: RuntimeWatch; stop: () => void }> {
  const subscription = startSubscription(client, { page, watch, sessionId });

  try {
    await watch.started();
  } catch (error) {
    subscription.unsubscribe();
    throw error;
  }

  return { watch, stop: () => subscription.unsubscribe() };
}

function startSubscription(
  client: RuntimeClient,
  { page, watch, sessionId }: RuntimeSubscription,
): ReturnType<RuntimeClient['subscription']> {
  return client.subscription(
    'feed.subscribe',
    { sessionId, after: { epoch: page.epoch, revision: page.maxRevision } },
    watchCallbacks(watch),
  );
}

function watchCallbacks(
  watch: RuntimeWatch,
): Parameters<RuntimeClient['subscription']>[2] {
  return {
    onData: receiveCallback(watch),
    onError: (error) => watch.fail(error),
    onComplete: () =>
      watch.fail(new Error('Feed subscription completed during observation')),
  };
}

type FeedDataCallback = NonNullable<
  Parameters<RuntimeClient['subscription']>[2]['onData']
>;

function receiveCallback(watch: RuntimeWatch): FeedDataCallback {
  return (event) => {
    try {
      watch.receive(FeedSubscribeOutput.parse(event));
    } catch (cause) {
      watch.fail(runtimeError(cause));
    }
  };
}
