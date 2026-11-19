import type {
  AccountFetchPattern,
  Gated,
  SignInData,
  SignInFlows,
  SignInGatePattern,
} from '@repo/contracts/plugins/sign-in-api';
import { drawSignIn, signInData } from './sign-in-parts';

export { provideSignIn } from './provide-sign-in';

// How long an answer is fresh unless the page says: a sign-out or a rejected token is noticed within it.
const freshForMs = 60_000;

export class SignInRequired extends Error {
  override name = 'SignInRequired';
}

const isSignInRequired = (cause: unknown): cause is Error =>
  cause instanceof Error && cause.name === 'SignInRequired';

async function loaded<Data>(
  flow: SignInFlows,
  serverDevice: boolean,
  run: () => Data | Promise<Data>,
): Promise<Gated<Data>> {
  try {
    return { data: await run() };
  } catch (cause) {
    if (!isSignInRequired(cause)) throw cause;

    return requireSignIn(flow, serverDevice, cause.message);
  }
}

function requireSignIn(
  flow: SignInFlows,
  serverDevice: boolean,
  message: string,
): Gated<never> {
  const [signIn, ...alternatives] = signInData(flow, serverDevice, message);

  if (!signIn) throw new Error('A sign-in gate needs a flow');

  return alternatives.length > 0 ? { signIn, alternatives } : { signIn };
}

const alternativesOf = (answer: {
  alternatives?: readonly SignInData[];
}): readonly SignInData[] => answer.alternatives ?? [];

/*
 * A page that draws the sign-in until the person is signed in: its Loader's `SignInRequired` becomes the
 * sign-in, which every `every` is tried again and which a sign-in's `argo.changed()` redraws.
 */
export const signInGate: SignInGatePattern = (flow, options, page) => ({
  ...page,
  every: page.every ?? freshForMs,
  load: (input) =>
    loaded(flow, input.context.serverDevice, () => page.load(input)),
  render: (answer, to, input) =>
    'signIn' in answer
      ? drawSignIn(flow, [answer.signIn, ...alternativesOf(answer)], {
          ...options,
          to,
          state: input.state,
        })
      : page.render(answer.data, to, input),
});

// Signing in is the way forward when no Account answers the borrow, or the service no longer accepts its token.
export const accountFetch: AccountFetchPattern =
  (argo, host) => async (url, init) => {
    const reply = await argo.fetch(url, { ...init, account: host });

    if (!reply) throw new SignInRequired(`Sign in to ${host}.`);

    if (reply.status === unauthorized)
      throw new SignInRequired(`${host} no longer accepts this sign-in.`);

    return reply;
  };

const unauthorized = 401;
