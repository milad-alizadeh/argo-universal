import type { Argo as ContractsArgo } from '@repo/contracts/plugins/argo-api';
import type {
  Hook as ContractsHook,
  HookContext as ContractsHookContext,
  HookEventName,
} from '@repo/contracts/plugins/hooks';
import type {
  LoaderInput as ContractsLoaderInput,
  LoaderPage as ContractsLoaderPage,
  PageTo as ContractsPageTo,
} from '@repo/contracts/plugins/loader-page-api';
import type { OperationHandler as ContractsOperationHandler } from '@repo/contracts/plugins/operations-api';
import type { PageState } from '@repo/contracts/plugins/page-address';
import type { PluginOperations } from './index';

// The Plugin API: the `argo` object a Plugin's `register` receives, inferred from the call schemas in Contracts.
export type Argo = ContractsArgo<PluginOperations>;

// A Loader page and the `to` its Render makes Component event values with (ADR-0050).
export type LoaderPage<
  State extends PageState,
  Data,
  Item = never,
> = ContractsLoaderPage<State, Data, Item, PluginOperations>;

// A page that declares no Page state names neither type's State.
export type PageTo<State extends PageState = PageState> = ContractsPageTo<
  State,
  PluginOperations
>;

export type LoaderInput<State extends PageState = PageState> =
  ContractsLoaderInput<State>;

// One declared Operation's handler, as `argo.operations.register(name, handler)` takes it.
export type OperationHandler<Name extends keyof PluginOperations> =
  ContractsOperationHandler<PluginOperations[Name]>;

export type Hook<Name extends HookEventName> = ContractsHook<
  Name,
  PluginOperations
>;

export type HookContext<Name extends HookEventName> = ContractsHookContext<
  Name,
  PluginOperations
>;
