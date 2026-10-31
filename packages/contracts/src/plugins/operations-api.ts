import type { WireJson } from '#plugin-wire-json';
import type {
  PluginOperationCaller,
  PluginOperationParams,
} from './plugin-operations';

/*
 * One of the Plugin's own Operations as its worker runs it: the params core checked against the
 * manifest, and who ran it. Whatever it returns crosses as the Operation's JSON result.
 */
export type OperationResult = WireJson | void;

export type OperationHandler = (
  params: Readonly<PluginOperationParams>,
  caller: PluginOperationCaller,
) => OperationResult | Promise<OperationResult>;

// `argo.operations`: the handler for each Operation the manifest declares, registered as the Plugin starts.
export type OperationsApi = Readonly<{
  register: (name: string, handler: OperationHandler) => void;
}>;
