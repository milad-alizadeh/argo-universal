import type {
  OAuthFlowArgo,
  OAuthFlowOptions,
  OAuthFlowPattern,
  OAuthFlowState,
} from '@repo/contracts/plugins/oauth-flow-api';
import { tokenLender } from './kept-token';
import {
  authorizeLocation,
  failed,
  signedIn,
  type Waiting,
} from './oauth-exchange';
import { clientIdOf, oauthRefresh } from './oauth-token';

// The one sign-in a flow holds, and the attempt whose answers still count.
type Held = { state: OAuthFlowState; attempt: symbol | null };

// What one attempt reaches: the Plugin's calls, the service, and whether it is still the current one.
type Attempt = {
  argo: OAuthFlowArgo;
  options: OAuthFlowOptions;
  live: () => boolean;
  settle: (state: OAuthFlowState) => OAuthFlowState;
};

type Given = Omit<Attempt, 'live' | 'settle'>;

const idle: OAuthFlowState = { kind: 'idle' };

const bearer = { header: 'Authorization', prefix: 'Bearer' };

/*
 * A kit pattern on the open `argo.oauth`, `argo.fetch`, `argo.accounts` and `argo.secrets` calls: start a
 * sign-in, wait for the browser, exchange the code for a token, add the Account and keep its token, saying
 * `argo.changed()` at each step so the pages that draw the state redraw.
 */
export const oauthFlow: OAuthFlowPattern = (argo, options) => {
  const held: Held = { state: idle, attempt: null };

  return Object.freeze({
    serverDevice: true,
    state: () => held.state,
    start: () => start(held, { argo, options }),
    cancel: () => cancel(held, argo),
    provide: () => provide(argo, options),
  });
};

// Each change of state is said, so the pages that draw it redraw.
const settling =
  (held: Held, argo: OAuthFlowArgo) =>
  (state: OAuthFlowState): OAuthFlowState => {
    held.state = state;
    argo.changed();

    return state;
  };

// A new attempt replaces the one before, whose answers then change nothing.
function current(held: Held, given: Given): Attempt {
  const mine = Symbol('attempt');
  const live = (): boolean => held.attempt === mine;
  const settle = settling(held, given.argo);

  held.attempt = mine;

  return {
    ...given,
    live,
    settle: (state) => (live() ? settle(state) : held.state),
  };
}

// Answers the state once the browser is open, or why it could not be.
async function start(held: Held, given: Given): Promise<OAuthFlowState> {
  const attempt = current(held, given);

  attempt.settle({ kind: 'waiting' });
  await opened(attempt).catch((error: Error) => attempt.settle(refused(error)));

  return held.state;
}

// Once Argo listens, the flow waits for the browser on its own, past the call that started it.
async function opened(attempt: Attempt): Promise<void> {
  const clientId = await clientIdOf(attempt.options);

  if (!clientId) {
    attempt.settle(failed('This Plugin has no OAuth client ID yet.'));

    return;
  }

  const started = await attempt.argo.oauth.start();

  if (started)
    void finished(attempt, { ...started, clientId }).then(
      attempt.settle,
      (error: Error) => attempt.settle(refused(error)),
    );
  else attempt.settle(failed('Couldn’t start sign-in.'));
}

// Argo's own message when another program holds the fixed callback port.
function refused(error: Error): OAuthFlowState {
  const message = String(error.message);

  return message.includes('in use')
    ? { kind: 'failed', reason: 'port-in-use', message }
    : failed(message);
}

// A denial, the five-minute timeout and a newer sign-in resolve to nothing, which leaves the flow idle.
async function finished(
  attempt: Attempt,
  waiting: Waiting,
): Promise<OAuthFlowState> {
  const url = authorizeLocation(attempt.options, waiting);
  const result = await attempt.argo.oauth.await(waiting.state, url);

  // A cancelled sign-in adds no Account, even when the person finished in the browser.
  if (!result || !attempt.live()) return idle;

  return signedIn(attempt.argo, attempt.options, { ...waiting, ...result });
}

function cancel(held: Held, argo: OAuthFlowArgo): OAuthFlowState {
  held.attempt = null;

  return settling(held, argo)(idle);
}

// A borrower's request gets the kept token, refreshed when it has run out, in the header the flow names; Argo sets it.
function provide(
  argo: OAuthFlowArgo,
  options: OAuthFlowOptions,
): Promise<void> {
  const lend = tokenLender(argo.secrets, oauthRefresh(argo.fetch, options));

  return argo.accounts.provide(
    options.host,
    options.header ?? bearer,
    (account) => lend(account.id),
  );
}
