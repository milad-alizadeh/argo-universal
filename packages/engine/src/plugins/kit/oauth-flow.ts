import type {
  OAuthFlowArgo,
  OAuthFlowOptions,
  OAuthFlowPattern,
  OAuthFlowState,
} from '@repo/contracts/plugins/oauth-flow-api';
import { heldSignIn, type HeldSignIn } from './held-sign-in';
import { provideKept } from './kept-token';
import {
  authorizeLocation,
  failed,
  signedIn,
  type Waiting,
} from './oauth-exchange';
import { clientOf, oauthRefresh } from './oauth-token';

// What one attempt reaches: the Plugin's calls, the service, and whether it is still the current one.
type Attempt = {
  argo: OAuthFlowArgo;
  options: OAuthFlowOptions;
  live: () => boolean;
  settle: (state: OAuthFlowState) => OAuthFlowState;
};

type Given = Omit<Attempt, 'live' | 'settle'>;

const idle: OAuthFlowState = { kind: 'idle' };

/*
 * A kit pattern on the open `argo.oauth`, `argo.fetch`, `argo.accounts` and `argo.secrets` calls: start a
 * sign-in, wait for the browser, exchange the code for a token, add the Account and keep its token, saying
 * `argo.changed()` at each step so the pages that draw the state redraw.
 */
export const oauthFlow: OAuthFlowPattern = (argo, options) => {
  const held = heldSignIn<OAuthFlowState>(argo, idle);

  return Object.freeze({
    serverDevice: true,
    state: held.state,
    start: () => start(held, { argo, options }),
    cancel: held.cancel,
    provide: () =>
      provideKept(argo, options, oauthRefresh(argo.fetch, options)),
  });
};

// Answers the state once the browser is open, or why it could not be.
async function start(
  held: HeldSignIn<OAuthFlowState>,
  given: Given,
): Promise<OAuthFlowState> {
  const attempt: Attempt = { ...given, ...held.begin() };

  attempt.settle({ kind: 'waiting' });
  await opened(attempt).catch((error: Error) => attempt.settle(refused(error)));

  return held.state();
}

// Once Argo listens, the flow waits for the browser on its own, past the call that started it.
async function opened(attempt: Attempt): Promise<void> {
  const client = await clientOf(attempt.options);

  if (typeof client === 'string') {
    attempt.settle(failed(client));

    return;
  }

  const started = await attempt.argo.oauth.start();

  if (started)
    void finished(attempt, { ...started, client }).then(
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
