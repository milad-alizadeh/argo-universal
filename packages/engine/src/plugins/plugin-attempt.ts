import type { SpawnCaller } from './hooks/spawn-hooks';
import { answerKept, isKeptRequest } from './kept-calls';
import type { Keychain } from './keychain';
import type { StateRequest, UnkeptRequest } from './plugin-calls';
import type { PluginResources } from './plugin-resources';
import type { PluginServiceOptions } from './plugin-service-options';
import type { PluginValue } from './runtime-protocol';
import type { PluginStorage } from './storage';

type AttemptContext = {
  caller: SpawnCaller;
  request: StateRequest;
  resources: PluginResources;
  storage: PluginStorage;
  keychain: Keychain;
  options: PluginServiceOptions;
  logCall: () => void;
  callMachine: (
    resources: PluginResources,
    request: UnkeptRequest,
  ) => Promise<PluginValue>;
};

export function attemptPluginCall(
  context: AttemptContext,
): Promise<PluginValue> {
  if (isKeptRequest(context.request))
    return answerKept({
      storage: context.storage,
      keychain: context.keychain,
      options: context.options,
      pluginId: context.caller.pluginId,
      request: context.request,
      onCall: context.logCall,
    });

  return context.callMachine(context.resources, context.request);
}
