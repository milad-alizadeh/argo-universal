import type {
  LoaderInput,
  LoaderPage,
  PageState,
  PageTo,
  RenderInput,
} from '@argo/plugin-kit';
import type { DeviceFlow } from './device-flow';
import { SignInRequired } from './github-api';
import { SignInScreen, type SignInData } from './sign-in-screen';

/*
 * How long a GitHub answer is fresh. A page opened again inside it makes no call; a sign-out or a rejected token
 * is noticed within it (ADR-0037).
 */
export const freshForMs = 60_000;

// What a gated page loads: its own data, or the sign-in in its place.
export type Gated<Data> = { data: Data } | { signIn: SignInData };

// What a Render answers.
type Rendered = ReturnType<LoaderPage<PageState, unknown>['render']>;

// A page the gate wraps: an ordinary Loader page, whose Loader answers once.
export type GatedPage<State extends PageState, Data, Item = never> = Omit<
  LoaderPage<State, Data, Item>,
  'load' | 'render'
> & {
  load: (input: LoaderInput<State>) => Data | Promise<Data>;
  render: (
    data: Data,
    to: PageTo<State>,
    input: RenderInput<State, Item>,
  ) => Rendered;
};

// A token the flow just reported as signed in, and GitHub then refused, is not signed in any more.
function signInOf(flow: DeviceFlow, rejected: string): SignInData {
  const state = flow.state();

  return { flow: state.kind === 'signed-in' ? { kind: 'idle' } : state, rejected };
}

async function loaded<Data>(
  flow: DeviceFlow,
  run: () => Data | Promise<Data>,
): Promise<Gated<Data>> {
  try {
    return { data: await run() };
  } catch (cause) {
    if (!(cause instanceof SignInRequired)) throw cause;

    return { signIn: signInOf(flow, cause.message) };
  }
}

const signInScreen = <State extends PageState>(
  signIn: SignInData,
  to: PageTo<State>,
): Rendered => (
  <SignInScreen
    {...signIn}
    start={to.run('signIn', {})}
    cancel={to.run('cancelSignIn', {})}
  />
);

/*
 * The sign-in gate (ADR-0036): a page whose reads found no Account, or one GitHub no longer accepts, draws the
 * sign-in in its place, and its own Render once a sign-in says `argo.changed()` and the reads run again.
 */
export function gated<State extends PageState, Data, Item = never>(
  flow: DeviceFlow,
  page: GatedPage<State, Data, Item>,
): LoaderPage<State, Gated<Data>, Item> {
  return {
    ...page,
    every: page.every ?? freshForMs,
    load: (input) => loaded(flow, () => page.load(input)),
    render: (answer, to, input) =>
      'signIn' in answer
        ? signInScreen(answer.signIn, to)
        : page.render(answer.data, to, input),
  };
}
