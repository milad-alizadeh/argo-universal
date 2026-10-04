import type {
  FeedPageInput,
  FeedPageOutput,
  FeedRowInput,
  FeedRowOutput,
  FeedSubscribeInput,
  FeedSubscribeOutput,
} from '@repo/contracts';

// Each method fails with tRPC `NOT_FOUND` for a Session or row that does not exist.
export interface FeedService {
  page(input: FeedPageInput): FeedPageOutput;
  row(input: FeedRowInput): FeedRowOutput;
  // tRPC passes no signal to a server-side call without one, so `undefined` is allowed.
  subscribe(
    input: FeedSubscribeInput,
    signal: AbortSignal | undefined,
  ): AsyncIterable<FeedSubscribeOutput>;
}
