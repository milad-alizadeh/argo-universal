import type { FetchReply } from '@repo/contracts/plugins/argo-calls';
import { PluginFetchCache } from './plugin-fetch-cache';
import type { Hop } from './plugin-fetch-response';

const okFirst = 200;

const okPast = 300;

const startMs = 1_000_000;

const isOk = (status: number): boolean => status >= okFirst && status < okPast;

export const reply = (
  status: number,
  headers: Record<string, string> = {},
  body = '',
): FetchReply => ({
  ok: isOk(status),
  status,
  statusText: '',
  headers,
  body,
  truncated: false,
});

export const hopOf = (
  path: string,
  headers: Record<string, string> = { authorization: 'Bearer one' },
  method = 'GET',
): Hop => ({
  url: new URL(`https://api.github.com${path}`),
  method,
  headers,
});

type Clock = { now: () => number; advance: (ms: number) => void };

type Service = {
  sent: Hop[];
  answer: (next: FetchReply) => void;
  clock: Clock;
  fetch: (hop: Hop) => Promise<FetchReply>;
};

function clockAt(start: number): Clock {
  let now = start;

  return {
    now: (): number => now,
    advance: (ms: number): void => {
      now += ms;
    },
  };
}

type Answering = { answer: FetchReply; sent: Hop[] };

// What the service does with each ask that reaches it: records it, and answers as last told.
const recordTo =
  (state: Answering) =>
  async (asked: Hop): Promise<FetchReply> => {
    state.sent.push(asked);

    return state.answer;
  };

// A cache in front of a service that answers whatever it was last told to, and records what reached it.
export function service(): Service {
  const state: Answering = { answer: reply(okFirst), sent: [] };
  const clock = clockAt(startMs);
  const cache = new PluginFetchCache(clock);

  return {
    sent: state.sent,
    clock,
    answer: (next): void => {
      state.answer = next;
    },
    fetch: (hop) => cache.fetch(hop, recordTo(state)),
  };
}
