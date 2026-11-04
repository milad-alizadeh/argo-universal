import { replyFailure } from '../access/capability-refusal';
import type { PluginData, QueryOrigin } from '../data/plugin-data';
import type { PluginHooks } from '../hooks/plugin-hooks';
import type { PluginOperations, RunOrigin } from '../operations';
import type { PluginDraws } from '../pages';
import type { Drawing } from '../pages/draw-calls';
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
  data: (runtime, { pluginId, generation, request }) =>
    runtime.data.handle(
      { pluginId, generation },
      request,
      queryOrigin(runtime, { pluginId, generation }, request),
    ),
  // A Plugin's answer to a named read a Query asked it to run (ADR-0037); it waits for nothing.
  reads: ({ data }, { pluginId, generation, request }) =>
    data.reads.receive({ pluginId, generation }, request.call),
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

  return runtime.services.handle(pluginId, generation, {
    ...request,
    ...callOrigin(runtime, message),
  });
}

type ServiceOrigin = { projectId: string | undefined; serverDevice: boolean };

const noOrigin: ServiceOrigin = { projectId: undefined, serverDevice: false };

/*
 * A call reaches what the call it runs for reaches: a draw's Project and Server Device, or an Operation run's
 * Project and Server Device. A draw or run that has already answered reaches neither. A call outside them
 * reaches only the Project its Hook ran for, and never the Server Device.
 */
function callOrigin(runtime: RuntimeCalls, message: StateCall): ServiceOrigin {
  const caller = { pluginId: message.pluginId, generation: message.generation };

  if (message.draw !== undefined)
    return drawOrigin(runtime.draws.drawing(caller, message.draw));

  if (message.operation !== undefined)
    return runOrigin(runtime.operations.origin(caller, message.operation));

  return { projectId: message.projectId, serverDevice: false };
}

const drawOrigin = (drawn: Drawing | undefined): ServiceOrigin =>
  drawn
    ? { projectId: drawn.projectId, serverDevice: drawn.serverDevice }
    : noOrigin;

const runOrigin = (origin: RunOrigin | undefined): ServiceOrigin =>
  origin
    ? { projectId: origin.projectId, serverDevice: origin.serverDevice }
    : noOrigin;

type DataRequest = Extract<PluginRequest, { api: 'data' }>;

/*
 * A view's Query is for the Project the view opened for; a Loader's read is for its draw's Project and is
 * held by its Page address. A read that names no draw still running reads nothing.
 */
function queryOrigin(
  runtime: RuntimeCalls,
  caller: { pluginId: string; generation: number },
  request: DataRequest,
): QueryOrigin {
  if (request.action !== 'read')
    return {
      projectId: runtime.views.dataView(caller.pluginId, request.viewId)
        .projectId,
    };

  const drawn = runtime.draws.drawing(caller, request.draw);

  return { projectId: drawn?.projectId, drawn };
}
