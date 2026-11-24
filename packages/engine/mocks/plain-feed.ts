import type { FeedSubscribeOutput } from '@repo/contracts';

// What an in-process caller of `feed.subscribe` yields: events with the ids tRPC's client resumes from, which reach it as a tracked envelope (`[id, event]`) or as `{ id, data }`.
interface IdentifiedEvent {
  id: string;
  data: FeedSubscribeOutput;
}

type Envelope = readonly [string, FeedSubscribeOutput, ...unknown[]];

export type Yielded = FeedSubscribeOutput | IdentifiedEvent | Envelope;

const isEnvelope = (value: Yielded): value is Envelope => Array.isArray(value);

const isIdentified = (value: Yielded): value is IdentifiedEvent =>
  'id' in value && 'data' in value;

interface Identified {
  id: string | undefined;
  event: FeedSubscribeOutput;
}

// An event with the id tRPC's client resumes from, if it has one.
export function identified(value: Yielded): Identified {
  if (isEnvelope(value)) return { id: value[0], event: value[1] };

  return isIdentified(value)
    ? { id: value.id, event: value.data }
    : { id: undefined, event: value };
}

// `feed.subscribe` as a test reads it: the events alone, without the ids that let a client resume. Stopping the plain iterator stops the subscription.
export async function plain(
  subscription: Promise<AsyncIterable<Yielded>>,
): Promise<AsyncIterable<FeedSubscribeOutput>> {
  const events = await subscription;

  return {
    [Symbol.asyncIterator]: (): AsyncIterator<FeedSubscribeOutput> => {
      const iterator = events[Symbol.asyncIterator]();

      return {
        next: async (): Promise<IteratorResult<FeedSubscribeOutput>> => {
          const result = await iterator.next();

          return result.done
            ? result
            : { done: false, value: identified(result.value).event };
        },
        return: async (): Promise<IteratorResult<FeedSubscribeOutput>> => {
          await iterator.return?.();

          return { done: true, value: undefined };
        },
      };
    },
  };
}
