import { randomBytes, createHash } from 'node:crypto';
import type { OAuthStart } from '@repo/contracts/plugins/account-calls';
import type { z } from 'zod';
import { realClock, type PluginClock } from '../clock';
import type { SpawnCaller } from '../hooks/spawn-hooks';
import {
  startExchange,
  type OAuthExchange,
  type ExchangeResult,
} from './oauth-exchange.machine';
import { OAuthListener, redirectUri } from './oauth-listener';
import { openAuthorizeUrl } from './platform-opener';

type Exchange = SpawnCaller & {
  state: string;
  verifier: string;
  lifecycle: OAuthExchange;
};

export type OAuthOptions = { open?: (url: string) => Promise<void> };

const entropyBytes = 32;

export class PluginOAuth {
  private readonly exchanges = new Map<string, Exchange>();
  private readonly listener;
  constructor(
    log: (line: string) => void,
    private readonly clock: PluginClock = realClock,
    private readonly options: OAuthOptions = {},
  ) {
    this.listener = new OAuthListener((state) => this.callback(state), log);
  }

  async start(caller: SpawnCaller): Promise<z.infer<typeof OAuthStart> | null> {
    this.release(caller.pluginId);
    const exchange = this.issue(caller);

    if (!(await this.listener.listen())) {
      this.finish(exchange.state, null);

      return null;
    }

    return this.exchanges.has(exchange.state) ? startValue(exchange) : null;
  }

  async await(
    caller: SpawnCaller,
    request: { state: string; url: string },
  ): Promise<ExchangeResult> {
    const exchange = this.exchanges.get(request.state);

    if (!exchange) return null;

    if (!mayAwait(exchange, caller)) return null;
    exchange.lifecycle.actor.send({ type: 'exchange.await' });
    void this.opener()(request.url).catch(() =>
      this.finish(request.state, null),
    );

    return exchange.lifecycle.answer;
  }

  release(pluginId: string): void {
    for (const [state, exchange] of this.exchanges)
      if (exchange.pluginId === pluginId) this.finish(state, null);
  }

  close(): void {
    for (const state of this.exchanges.keys()) this.finish(state, null);
    this.listener.close();
  }

  private opener(): (url: string) => Promise<void> {
    return this.options.open ?? openAuthorizeUrl;
  }

  private issue(caller: SpawnCaller): Exchange {
    const state = randomBytes(entropyBytes).toString('base64url');

    const exchange = {
      ...caller,
      state,
      verifier: randomBytes(entropyBytes).toString('base64url'),
      lifecycle: startExchange(this.clock, () => this.forget(state)),
    };

    this.exchanges.set(state, exchange);

    return exchange;
  }

  private finish(state: string, result: ExchangeResult): void {
    this.exchanges
      .get(state)
      ?.lifecycle.actor.send({ type: 'exchange.finish', result });
  }

  private forget(state: string): void {
    this.exchanges.delete(state);

    if (this.exchanges.size === 0) this.listener.close();
  }

  private callback(state: string): ((code: string | null) => void) | undefined {
    const exchange = this.exchanges.get(state);

    if (!exchange) return;

    return (code) =>
      this.finish(state, code ? { code, verifier: exchange.verifier } : null);
  }
}

const sameWorker = (left: SpawnCaller, right: SpawnCaller): boolean =>
  left.pluginId === right.pluginId && left.generation === right.generation;

const mayAwait = (exchange: Exchange, caller: SpawnCaller): boolean =>
  sameWorker(exchange, caller) &&
  exchange.lifecycle.actor.getSnapshot().matches({ pending: 'issued' });

const startValue = ({
  state,
  verifier,
}: Exchange): z.infer<typeof OAuthStart> => ({
  redirectUri,
  state,
  codeChallenge: createHash('sha256').update(verifier).digest('base64url'),
  codeChallengeMethod: 'S256',
});
