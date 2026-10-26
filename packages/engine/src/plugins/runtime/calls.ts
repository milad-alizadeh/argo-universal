import type { SlotCall } from '@repo/contracts/plugins/argo-calls';
import { replyFailure } from '../access/capability-refusal';
import type { PluginData } from '../data/plugin-data';
import type { PluginHooks } from '../hooks/plugin-hooks';
import type {
  HostMessage,
  PluginReply,
  PluginRequest,
} from '../protocol/runtime';
import type { StateRequest } from '../services/plugin-calls';
import type { PluginServices } from '../services/plugin-services';
import type { PluginSlotItems } from '../slots/plugin-slot-items';
import type { Caller } from '../slots/slot-item-calls';
import type { PluginViews } from '../views/plugin-views';

type RuntimeCalls = {
  hooks: PluginHooks;
  services: PluginServices;
  views: PluginViews;
  data: PluginData;
  items: PluginSlotItems;
};

type Call = Extract<HostMessage, { type: 'call' }>;

type ServiceCall = Omit<Call, 'request'> & {
  request: Exclude<PluginRequest, { api: 'hooks' | 'view' | 'data' | 'nav' }>;
};

type ViewCall = Omit<Call, 'request'> & {
  request: Exclude<PluginRequest, { api: 'data' | 'nav' }>;
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

function answer(runtime: RuntimeCalls, message: Call): Promise<PluginReply> {
  const { pluginId, generation, request } = message;

  if (request.api === 'nav')
    return Promise.resolve(answerBadge(runtime, message, request));

  if (request.api === 'data')
    return runtime.data.handle(pluginId, generation, request);

  return answerHookOrView(runtime, { ...message, request });
}

function answerBadge(
  runtime: RuntimeCalls,
  { pluginId, generation }: Call,
  request: Extract<PluginRequest, { api: 'nav' }>,
): PluginReply {
  try {
    runtime.data.badges.set(pluginId, generation, request);

    return { ok: true };
  } catch (error) {
    return replyFailure(error);
  }
}

function answerHookOrView(
  runtime: RuntimeCalls,
  message: ViewCall,
): Promise<PluginReply> {
  const { pluginId, generation, request } = message;

  if (request.api === 'hooks')
    return runtime.hooks.reply({ pluginId, generation }, request.call);

  if (request.api === 'view') {
    runtime.views.receive(pluginId, request.viewId, request.message);

    return Promise.resolve({ ok: true });
  }

  return answerViewOrService(runtime, { ...message, request });
}

// A Plugin's batched items answer, failure or change signal (ADR-0035); it waits for nothing.
function receiveSlotCall(
  runtime: RuntimeCalls,
  caller: Caller,
  call: SlotCall,
): Promise<PluginReply> {
  runtime.items.receive(caller, call);

  return Promise.resolve({ ok: true });
}

function answerViewOrService(
  runtime: RuntimeCalls,
  call: ServiceCall,
): Promise<PluginReply> {
  const { pluginId, generation, request } = call;

  if (request.api === 'dispatchResult')
    return settleDispatch(runtime, pluginId, request);

  if (request.api === 'slots')
    return receiveSlotCall(runtime, { pluginId, generation }, request.call);

  return answerService(runtime, { ...call, request });
}

type StateCall = Pick<
  Call,
  'pluginId' | 'generation' | 'viewId' | 'projectId'
> & { request: StateRequest };

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

function settleDispatch(
  runtime: RuntimeCalls,
  pluginId: string,
  request: Extract<PluginRequest, { api: 'dispatchResult' }>,
): Promise<PluginReply> {
  runtime.views.dispatches.settle(pluginId, request.requestId, request.result);

  return Promise.resolve({ ok: true });
}
