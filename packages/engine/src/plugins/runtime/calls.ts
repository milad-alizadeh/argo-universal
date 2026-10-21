import type { PluginHooks } from '../hooks/plugin-hooks';
import type {
  HostMessage,
  PluginReply,
  PluginRequest,
} from '../protocol/runtime';
import type { PluginServices } from '../services/plugin-services';
import type { PluginViews } from '../views/plugin-views';

type RuntimeCalls = {
  hooks: PluginHooks;
  services: PluginServices;
  views: PluginViews;
};

type Call = Extract<HostMessage, { type: 'call' }>;

type ServiceCall = Omit<Call, 'request'> & {
  request: Exclude<PluginRequest, { api: 'hooks' | 'view' }>;
};

export async function answerPluginCall(
  runtime: RuntimeCalls,
  message: Call,
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

function answerViewOrService(
  runtime: RuntimeCalls,
  { pluginId, generation, request }: ServiceCall,
): Promise<PluginReply> {
  if (request.api === 'dispatchResult') {
    const { requestId, result } = request;
    runtime.views.dispatches.settle(pluginId, requestId, result);

    return Promise.resolve({ ok: true });
  }

  return runtime.services.handle(pluginId, generation, request);
}
