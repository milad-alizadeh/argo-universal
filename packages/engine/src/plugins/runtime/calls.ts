import { replyFailure } from '../access/capability-refusal';
import type { PluginData } from '../data/plugin-data';
import type { PluginHooks } from '../hooks/plugin-hooks';
import type { PluginOperations } from '../operations';
import type { PluginDraws } from '../pages';
import type { DrawLookup } from '../pages/draw-calls';
import { reachOf, type DrawReach } from '../protocol/call-origin';
import type {
  HostMessage,
  PluginReply,
  PluginRequest,
} from '../protocol/runtime';
import type { StateRequest } from '../services/plugin-calls';
import type { PluginServices } from '../services/plugin-services';
import type { PluginSlotItems } from '../slots/plugin-slot-items';

// What answers one worker call: the runtime's own resources, with the Hooks and services beside them.
export type RuntimeCalls = {
  hooks: PluginHooks;
  services: PluginServices;
  data: PluginData;
  items: PluginSlotItems;
  operations: PluginOperations;
  draws: PluginDraws;
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
  data: (runtime, call) =>
    runtime.data.handle(
      { pluginId: call.pluginId, generation: call.generation },
      call.request,
      reach(runtime, call),
    ),
  // A Plugin's answer to a named read a Query asked it to run (ADR-0037); it waits for nothing.
  reads: ({ data }, { pluginId, generation, request }) =>
    data.reads.receive({ pluginId, generation }, request.call),
  hooks: ({ hooks }, { pluginId, generation, request }) =>
    hooks.reply({ pluginId, generation }, request.call),
  // A Plugin's batched items answer, failure or change signal (ADR-0035); it waits for nothing.
  slots: ({ items }, { pluginId, generation, request }) =>
    items.receive({ pluginId, generation }, request.call),
  // A Plugin's answer to one of its own Operations (ADR-0044); it waits for nothing.
  operations: ({ operations }, { pluginId, generation, request }) =>
    operations.receive({ pluginId, generation }, request.call),
  // A Loader page's tree, failure or defined pattern (ADR-0050); it waits for nothing.
  pages: ({ draws }, { pluginId, generation, request }) =>
    draws.receive({ pluginId, generation }, request.call),
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
  const { projectId, serverDevice } = reach(runtime, message);

  return runtime.services.handle(pluginId, generation, {
    ...request,
    projectId,
    serverDevice,
  });
}

// What a call reaches is looked up from the draw or the run its origin names, still waiting on its generation.
function reach(
  { draws, operations }: RuntimeCalls,
  { pluginId, generation, origin }: Omit<Call, 'request'>,
): DrawReach<DrawLookup> {
  const caller = { pluginId, generation };

  return reachOf(
    {
      draw: (id) => draws.lookup(caller, id),
      run: (id) => operations.origin(caller, id),
    },
    origin,
  );
}
