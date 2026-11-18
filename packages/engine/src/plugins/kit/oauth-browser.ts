import type {
  OAuthFlowArgo,
  OAuthFlowOptions,
  OAuthFlowState,
} from '@repo/contracts/plugins/oauth-flow-api';
import type { OAuthFlow } from '@repo/contracts/plugins/oauth-flow-api';
import { heldSignIn, type HeldSignIn } from './held-sign-in';
import {
  authorizeLocation,
  failed,
  signedIn,
  type Waiting,
} from './oauth-exchange';
import { clientOf } from './oauth-token';

// What one attempt reaches: the Plugin's calls, the service, and whether it is still the current one.
type Attempt = {
  argo: OAuthFlowArgo;
  options: OAuthFlowOptions;
  live: () => boolean;
  opened: (state: string) => () => void;
  settle: (state: OAuthFlowState) => OAuthFlowState;
};

type Given = Omit<Attempt, 'live' | 'settle' | 'opened'>;

const idle: OAuthFlowState = { kind: 'idle' };

type Opening = {
  state?: string;
  attempt?: Promise<OAuthFlowState>;
};

function release(argo: OAuthFlowArgo, opening: Opening): Promise<null> {
  const state = opening.state;
  delete opening.state;

  return state ? argo.oauth.cancel(state) : Promise.resolve(null);
}

function remember(opening: Opening, state: string): () => void {
  opening.state = state;

  return () => {
    if (opening.state === state) delete opening.state;
  };
}

type BrowserFlow = Pick<OAuthFlow, 'state' | 'start' | 'cancel'>;

export function browserFlow(given: Given): BrowserFlow {
  const held = heldSignIn<OAuthFlowState>(given.argo, idle);
  const opening: Opening = {};

  return {
    state: held.state,
    start: () => {
      void release(given.argo, opening).catch(() => null);
      opening.attempt = start(held, given, (state) => remember(opening, state));

      return opening.attempt;
    },
    cancel: () => cancelBrowser(held, given.argo, opening),
  };
}

async function cancelBrowser(
  held: HeldSignIn<OAuthFlowState>,
  argo: OAuthFlowArgo,
  opening: Opening,
): Promise<OAuthFlowState> {
  const state = held.cancel();
  const attempt = opening.attempt;
  await release(argo, opening);
  await attempt;

  return state;
}

// Answers the state once the browser is open, or why it could not be.
async function start(
  held: HeldSignIn<OAuthFlowState>,
  given: Given,
  remember: Attempt['opened'],
): Promise<OAuthFlowState> {
  const attempt: Attempt = { ...given, ...held.begin(), opened: remember };

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

  if (!attempt.live()) return;

  await openCallback(attempt, client);
}

async function openCallback(
  attempt: Attempt,
  client: Waiting['client'],
): Promise<void> {
  const started = await attempt.argo.oauth.start();

  if (!started) {
    attempt.settle(failed('Couldn’t start sign-in.'));

    return;
  }

  await waitForBrowser(attempt, { ...started, client });
}

async function waitForBrowser(
  attempt: Attempt,
  waiting: Waiting,
): Promise<void> {
  if (!attempt.live()) {
    await attempt.argo.oauth.cancel(waiting.state);

    return;
  }

  const closed = attempt.opened(waiting.state);
  void finished(attempt, waiting, closed).then(attempt.settle, (error: Error) =>
    attempt.settle(refused(error)),
  );
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
  closed: () => void,
): Promise<OAuthFlowState> {
  const result = await callback(attempt, waiting).finally(closed);

  if (!result || !attempt.live()) return idle;

  return signedIn(attempt, { ...waiting, ...result });
}

function callback(
  { argo, options }: Attempt,
  waiting: Waiting,
): ReturnType<OAuthFlowArgo['oauth']['await']> {
  return argo.oauth
    .await(waiting.state, authorizeLocation(options, waiting))
    .catch(async (error: Error) => {
      await argo.oauth.cancel(waiting.state);
      throw error;
    });
}
