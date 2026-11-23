import type { PluginOperations } from './index';

// One service's device flow, which finishes from any Device (ADR-0036); `DeviceFlow` says what it does.
export declare const deviceFlow: DeviceFlowPattern;

export type * from '@repo/contracts/plugins/device-flow-api';

import type {
  DeviceFlowPattern,
  SignInFlow,
} from '@repo/contracts/plugins/device-flow-api';
import type { PageState as SignInPageState } from '@repo/contracts/plugins/page-address';
import type {
  AccountFetchPattern,
  CombinedSignInFlows,
  Gated,
  GatedPage as ContractsGatedPage,
  SignInOptions,
  SignInFlows,
  ProvideSignInOptions,
} from '@repo/contracts/plugins/sign-in-api';
import type { Argo, LoaderPage } from './plugin-api';

export type {
  Gated,
  SignInData,
  SignInOptions,
  SignInFlows,
} from '@repo/contracts/plugins/sign-in-api';

// A Loader page for `signInGate` to wrap, bound to this Plugin's declared Operations.
export type GatedPage<
  State extends SignInPageState,
  Data,
  Item = never,
> = ContractsGatedPage<State, Data, Item, PluginOperations>;

/*
 * A read that finds no Account throws
 * `SignInRequired`, and `signInGate` draws the sign-in in the page's place.
 */
export declare class SignInRequired extends Error {}

export declare function signInGate<
  State extends SignInPageState,
  Data,
  Item = never,
>(
  flow: SignInFlows,
  options: SignInOptions,
  page: GatedPage<State, Data, Item>,
): LoaderPage<State, Gated<Data>, Item>;

export declare function provideSignIn(
  argo: Pick<Argo, 'operations' | 'pages'>,
  flow: SignInFlow,
  options: ProvideSignInOptions,
): Promise<void>;

export declare function provideSignIn(
  argo: Pick<Argo, 'operations' | 'pages' | 'accounts' | 'changed'>,
  flow: CombinedSignInFlows,
  options: ProvideSignInOptions,
): Promise<void>;

// `argo.fetch` as the person signed in to a host: no Account or a 401 throws `SignInRequired`.
export declare const accountFetch: AccountFetchPattern;
