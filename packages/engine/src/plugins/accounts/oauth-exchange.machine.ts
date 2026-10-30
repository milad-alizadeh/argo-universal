import type { OAuthResult } from '@repo/contracts/plugins/account-calls';
import {
  assign,
  assertEvent,
  setup,
  createActor,
  type ActorRefFrom,
} from 'xstate';
import type { z } from 'zod';
import type { PluginClock } from '../clock';

export type ExchangeResult = z.infer<typeof OAuthResult> | null;

type ExchangeEvent =
  | { type: 'exchange.await' }
  | { type: 'exchange.finish'; result: ExchangeResult };

type ExchangeContext = { result: ExchangeResult };

const exchangeLimitMs = 300_000;

const oauthExchangeMachine = setup({
  // SAFETY: XState consumes these declarations as types only.
  types: {
    context: {} as ExchangeContext,
    events: {} as ExchangeEvent,
  },
  actions: {
    finish: assign({
      result: ({ event }) => {
        assertEvent(event, 'exchange.finish');

        return event.result;
      },
    }),
  },
}).createMachine({
  id: 'oauthExchange',
  context: { result: null },
  initial: 'pending',
  states: {
    pending: {
      initial: 'issued',
      after: { [exchangeLimitMs]: 'settled' },
      on: { 'exchange.finish': { target: 'settled', actions: 'finish' } },
      states: { issued: { on: { 'exchange.await': 'waiting' } }, waiting: {} },
    },
    settled: { type: 'final' },
  },
});

export type OAuthExchange = {
  actor: ActorRefFrom<typeof oauthExchangeMachine>;
  answer: Promise<ExchangeResult>;
};

export function startExchange(
  clock: PluginClock,
  settled: () => void,
): OAuthExchange {
  const actor = createActor(oauthExchangeMachine, {
    clock: {
      setTimeout: (run, ms) => clock.schedule(run, ms),
      clearTimeout: (cancel: () => void) => cancel(),
    },
  });

  const answer = exchangeAnswer(actor, settled);

  actor.start();

  return { actor, answer };
}

function exchangeAnswer(
  actor: OAuthExchange['actor'],
  settled: () => void,
): Promise<ExchangeResult> {
  return new Promise((resolve) =>
    actor.subscribe({
      complete: () => {
        resolve(actor.getSnapshot().context.result);
        settled();
      },
    }),
  );
}
