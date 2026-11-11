import type { ReactNode } from 'react';
import type { SignInFlow, SignInState } from './device-flow-api';
import type {
  LoaderInput,
  LoaderPage,
  PageTo,
  RenderInput,
} from './loader-page-api';
import type { Argo } from './argo-api';
import type { OperationDeclarations } from './operations-api';
import type { PageState } from './page-address';

/*
 * How a service is named on the sign-in page, such as `GitHub`. Nothing else is Argo's: the Plugin owns its
 * sign-in (ADR-0036), and the kit draws it.
 */
export type SignInOptions = Readonly<{ name: string }>;

/*
 * What the sign-in page draws: the flow where it stands, why a token already in use was refused when it was,
 * and whether this Device has to hand over to the Server Device, which a redirect flow needs.
 */
export type SignInData = Readonly<{
  flow: SignInState;
  rejected: string | null;
  needsServerDevice: boolean;
}>;

// What a gated page loads: its own data, or the sign-in in its place.
export type Gated<Data> = { data: Data } | { signIn: SignInData };

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
  flow: SignInFlow,
  options: SignInOptions,
  page: GatedPage<State, Data, Item>,
) => LoaderPage<State, Gated<Data>, Item>;

// What `provideSignIn` registers on.
export type ProvideSignInArgo = Pick<Argo, 'operations' | 'pages'>;

/*
 * `provideSignIn(argo, flow, options)` wires a flow into the Plugin: the `signIn` and `cancelSignIn` Operations
 * the sign-in page's buttons run (declare both in `contributes.operations`), the sign-in page itself at `path`
 * (`/sign-in` unless said, the page `contributes.accounts` names), and the Account's provider.
 */
export type ProvideSignInPattern = (
  argo: ProvideSignInArgo,
  flow: SignInFlow,
  options: SignInOptions & { path?: string },
) => Promise<void>;
