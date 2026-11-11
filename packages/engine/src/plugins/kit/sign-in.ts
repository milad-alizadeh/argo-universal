import type { SignInFlow } from '@repo/contracts/plugins/device-flow-api';
import type {
  LoaderInput,
  PageTo,
} from '@repo/contracts/plugins/loader-page-api';
import type { PageState } from '@repo/contracts/plugins/page-address';
import type {
  Gated,
  ProvideSignInPattern,
  SignInData,
  SignInGatePattern,
  SignInOptions,
} from '@repo/contracts/plugins/sign-in-api';
import type { ReactElement } from 'react';
import { signInScreen, type SignInParts } from './sign-in-screen';

// How long an answer is fresh unless the page says: a sign-out or a rejected token is noticed within it (ADR-0037).
const freshForMs = 60_000;

/*
 * Thrown by a read that finds the person signed out, or no longer accepted: the gate answers it with the
 * sign-in. `message` says why, and is drawn on the page.
 */
export class SignInRequired extends Error {
  override name = 'SignInRequired';
}

// Recognised by name, so a Plugin module that cannot import the kit, a pure one its unit tests load, may throw its own.
const isSignInRequired = (cause: unknown): cause is Error =>
  cause instanceof Error && cause.name === 'SignInRequired';

// A token the flow just reported as signed in, and the service then refused, is not signed in any more.
function flowStateOf(
  flow: SignInFlow,
  rejected: string | null,
): SignInData['flow'] {
  const state = flow.state();

  return rejected !== null && state.kind === 'signed-in'
    ? { kind: 'idle' }
    : state;
}

const signInData = (
  flow: SignInFlow,
  serverDevice: boolean,
  rejected: string | null,
): SignInData => ({
  flow: flowStateOf(flow, rejected),
  rejected,
  needsServerDevice: flow.serverDevice && !serverDevice,
});

async function loaded<Data>(
  flow: SignInFlow,
  serverDevice: boolean,
  run: () => Data | Promise<Data>,
): Promise<Gated<Data>> {
  try {
    return { data: await run() };
  } catch (cause) {
    if (!isSignInRequired(cause)) throw cause;

    return { signIn: signInData(flow, serverDevice, cause.message) };
  }
}

type Runs = Pick<PageTo<PageState>, 'run'>;

const runsOf = (to: Runs): Pick<SignInParts, 'start' | 'cancel'> => ({
  start: to.run('signIn', {}),
  cancel: to.run('cancelSignIn', {}),
});

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
      ? signInScreen({ name: options.name, data: answer.signIn, ...runsOf(to) })
      : page.render(answer.data, to, input),
});

// The page `contributes.accounts` names: the flow where it stands, for a Device that has not signed in yet.
type SignInPage = {
  load: (input: LoaderInput<PageState>) => SignInData;
  render: (data: SignInData, to: Runs) => ReactElement;
};

const signInPage = (flow: SignInFlow, { name }: SignInOptions): SignInPage => ({
  load: ({ context }) => signInData(flow, context.serverDevice, null),
  render: (data, to) => signInScreen({ name, data, ...runsOf(to) }),
});

export const provideSignIn: ProvideSignInPattern = async (
  argo,
  flow,
  options,
) => {
  argo.operations.register('signIn', async () => ({ ...(await flow.start()) }));
  argo.operations.register('cancelSignIn', () => ({ ...flow.cancel() }));
  argo.pages.define(options.path ?? '/sign-in', signInPage(flow, options));

  await flow.provide();
};
