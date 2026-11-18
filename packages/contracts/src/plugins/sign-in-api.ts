import type { ReactNode } from 'react';
import type { Argo, FetchResponse } from './argo-api';
import type { SignInFlow, SignInState } from './device-flow-api';
import type {
  LoaderInput,
  LoaderPage,
  PageTo,
  RenderInput,
} from './loader-page-api';
import type { OAuthFlow } from './oauth-flow-api';
import type { OperationDeclarations } from './operations-api';
import type { PageState } from './page-address';
import type { TokenPaste } from './token-paste-api';

export type CombinedSignInFlows =
  | readonly [TokenPaste, OAuthFlow]
  | readonly [OAuthFlow, TokenPaste];

export type SignInFlows = SignInFlow | CombinedSignInFlows;

/*
 * How a service is named on the sign-in page, such as `GitHub`, and its logo: SVG markup the Plugin ships, drawn in
 * the page's mark. Without one, the App draws the Plugin's own icon. Nothing else is Argo's: the Plugin owns its
 * sign-in (ADR-0036), and the kit draws it.
 */
export type SignInOptions = Readonly<{ name: string; logo?: string }>;

/*
 * What the sign-in page draws: the flow where it stands, why a token already in use was refused when it was,
 * whether this Device has to hand over to the Server Device, which a redirect flow needs, and whether the person
 * pastes a token rather than starting a flow.
 */
export type SignInData = Readonly<{
  flow: SignInState;
  rejected: string | null;
  needsServerDevice: boolean;
  pastesToken: boolean;
}>;

// What a gated page loads: its own data, or the sign-in in its place.
export type Gated<Data> =
  | { data: Data }
  | { signIn: SignInData; alternatives?: readonly SignInData[] };

/*
 * An ordinary Loader page for the gate to wrap, whose Loader answers once. A read that finds no Account, or an
 * Account the service no longer accepts, throws `SignInRequired`, and the gate draws the sign-in in its place.
 */
export type GatedPage<
  State extends PageState,
  Data,
  Item = never,
  Operations = OperationDeclarations,
> = Omit<LoaderPage<State, Data, Item, Operations>, 'load' | 'render'> & {
  load: (input: LoaderInput<State>) => Data | Promise<Data>;
  render: (
    data: Data,
    to: PageTo<State, Operations>,
    input: RenderInput<State, Item>,
  ) => ReactNode;
};

/*
 * `signInGate(flow, options, page)`: the page, drawing the sign-in until the person is signed in. A page it
 * wraps is drawn again once a sign-in says `argo.changed()`, and every `every` it reads again, which is a
 * minute unless the page says otherwise, so a sign-out or a rejected token is noticed within it.
 */
export type SignInGatePattern = <State extends PageState, Data, Item = never>(
  flow: SignInFlows,
  options: SignInOptions,
  page: GatedPage<State, Data, Item>,
) => LoaderPage<State, Gated<Data>, Item>;

// What `provideSignIn` registers on.
export type ProvideSignInArgo = Pick<Argo, 'operations' | 'pages'>;

/*
 * `provideSignIn(argo, flow, options)` wires a flow into the Plugin: the `signIn` and `cancelSignIn` Operations
 * the sign-in page's buttons run (declare both in `contributes.operations`), the sign-in page itself at `path`
 * (`/sign-in` unless said, the page `contributes.accounts` names), and the Account's provider. A token paste's
 * `signIn` takes the pasted token as its `token` param, which the manifest marks `"secret": true`; it needs no
 * `cancelSignIn`.
 */
export type ProvideSignInOptions = SignInOptions & { path?: string };

export type CombinedSignInArgo = Pick<Argo, 'accounts' | 'changed'>;

export type ProvideSignInPattern = {
  (
    argo: ProvideSignInArgo,
    flow: SignInFlow,
    options: ProvideSignInOptions,
  ): Promise<void>;
  (
    argo: ProvideSignInArgo & CombinedSignInArgo,
    flow: CombinedSignInFlows,
    options: ProvideSignInOptions,
  ): Promise<void>;
};

// What `accountFetch` needs of the Plugin API, and the Account's host it signs requests as.
export type AccountFetchArgo = Pick<Argo, 'fetch'>;

type AccountFetchInit = NonNullable<Parameters<Argo['fetch']>[1]>;

/*
 * `accountFetch(argo, host)`: `argo.fetch` as the person signed in to `host`. The kit borrows the Account, so the
 * Plugin never holds a token. A call that finds no Account, or one the service rejects with a 401, throws
 * `SignInRequired`, which a `signInGate` page answers with the sign-in; any other status is the reply, to check.
 */
export type AccountFetchPattern = (
  argo: AccountFetchArgo,
  host: string,
) => (
  url: string,
  init?: Omit<AccountFetchInit, 'account'>,
) => Promise<FetchResponse>;
