import { replyFailure } from '../access/capability-refusal';
import type { PluginData } from '../data/plugin-data';
import type { PluginHooks } from '../hooks/plugin-hooks';
import type { PluginOperations } from '../operations';
import type {
  HostMessage,
  PluginReply,
  PluginRequest,
} from '../protocol/runtime';
import type { StateRequest } from '../services/plugin-calls';
import type { PluginServices } from '../services/plugin-services';
import type { PluginSlotItems } from '../slots/plugin-slot-items';
import type { PluginViews } from '../views/plugin-views';

// What answers one worker call: the runtime's own resources, with the Hooks and services beside them.
export type RuntimeCalls = {
  hooks: PluginHooks;
  services: PluginServices;
  views: PluginViews;
  data: PluginData;
  items: PluginSlotItems;
  operations: PluginOperations;
};

type Call = Extract<HostMessage, { type: 'call' }>;

// Pages, Hooks, Queries, badges and Slot items are the runtime's own; PluginServices answers the rest.
type RuntimeRequest = Exclude<PluginRequest, StateRequest>;

type RuntimeApi = RuntimeRequest['api'];

type CallOf<Name extends RuntimeApi> = Omit<Call, 'request'> & {
  request: Extract<RuntimeRequest, { api: Name }> & { api: Name };
};

type Answer<Name extends RuntimeApi> = (
  runtime: RuntimeCalls,
  call: CallOf<Name>,
) => Promise<PluginReply> | void;

type RuntimeAnswers = { [Name in RuntimeApi]: Answer<Name> };

const runtimeCalls: RuntimeAnswers = {
  nav: ({ data }, { pluginId, generation, request }) =>
    data.badges.set(pluginId, generation, request),
  data: ({ data }, { pluginId, generation, request }) =>
    data.handle(pluginId, generation, request),
  hooks: ({ hooks }, { pluginId, generation, request }) =>
    hooks.reply({ pluginId, generation }, request.call),
  view: ({ views }, { pluginId, request }) =>
    views.receive(pluginId, request.viewId, request.message),
  dispatchResult: ({ views }, { pluginId, request }) =>
    views.dispatches.settle(pluginId, request.requestId, request.result),
  // A Plugin's batched items answer, failure or change signal (ADR-0035); it waits for nothing.
  slots: ({ items }, { pluginId, generation, request }) =>
    items.receive({ pluginId, generation }, request.call),
  // A Plugin's answer to one of its own Operations (ADR-0044); it waits for nothing.
  operations: ({ operations }, { pluginId, generation, request }) =>
    operations.receive({ pluginId, generation }, request.call),
};

export async function answerPluginCall(
  runtime: RuntimeCalls,
  message: Call,
): Promise<PluginReply> {
  try {
    return await answer(runtime, message);
  } catch (error) {
    return replyFailure(error);
  }
}

const isRuntimeRequest = (request: PluginRequest): request is RuntimeRequest =>
  Object.hasOwn(runtimeCalls, request.api);

async function answer(runtime: RuntimeCalls, call: Call): Promise<PluginReply> {
  const { request } = call;

  if (!isRuntimeRequest(request))
    return answerService(runtime, { ...call, request });

  return (await answerRuntime(runtime, { ...call, request })) ?? { ok: true };
}

const answerRuntime = <Name extends RuntimeApi>(
  runtime: RuntimeCalls,
  call: CallOf<Name>,
): ReturnType<Answer<Name>> => runtimeCalls[call.request.api](runtime, call);

type StateCall = Omit<Call, 'request'> & { request: StateRequest };

function answerService(
  runtime: RuntimeCalls,
  message: StateCall,
): Promise<PluginReply> {
  const { pluginId, generation, request } = message;

  return runtime.services.handle(pluginId, generation, {
    ...request,
    ...callOrigin(runtime, message),
  });
}

function callOrigin(runtime: RuntimeCalls, message: StateCall): ServiceOrigin {
  if (!message.viewId)
    return { projectId: message.projectId, serverDevice: false };
  const view = runtime.views.dataView(message.pluginId, message.viewId);

  return {
    projectId: view.projectId,
    serverDevice: view.opening.serverDevice === true,
  };
}

type ServiceOrigin = { projectId: string | undefined; serverDevice: boolean };
