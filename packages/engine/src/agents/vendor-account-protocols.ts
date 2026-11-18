import { z } from 'zod';
import type {
  AccountUsageProtocol,
  StatusReply,
} from './account-usage-protocol';
import type { AgentLaunch } from './agent-launch';
import type { AccountJson } from './vendor-usage-reading';

const ClaudeResponse = z.object({
  type: z.literal('control_response'),
  response: z.object({
    request_id: z.string(),
    subtype: z.string(),
    response: z.json().optional(),
  }),
});

const control = (
  id: number,
  request: { subtype: string; skip_behaviors?: boolean },
): AccountJson => ({
  type: 'control_request',
  request_id: String(id),
  request,
});

function claudeResponse(
  message: AccountJson,
  id: number,
): StatusReply | undefined {
  const result = ClaudeResponse.safeParse(message).data;

  if (!result) return;
  const { response } = result;

  if (response.request_id !== String(id)) return;

  return { result: response.response, failed: response.subtype !== 'success' };
}

export const claudeAccountProtocol: AccountUsageProtocol = {
  args: [
    '--cli',
    '-p',
    '--safe-mode',
    '--input-format',
    'stream-json',
    '--output-format',
    'stream-json',
    '--verbose',
    '--no-session-persistence',
  ],
  initialize: control(1, { subtype: 'initialize' }),
  read: control(2, { subtype: 'get_usage', skip_behaviors: true }),
  response: claudeResponse,
};

const CodexResponse = z.object({
  method: z.never().optional(),
  id: z.number(),
  result: z.json().optional(),
  error: z.json().optional(),
});

function codexResponse(
  message: AccountJson,
  id: number,
): StatusReply | undefined {
  const reply = CodexResponse.safeParse(message).data;

  if (!reply || reply.id !== id) return;

  return { result: reply.result, failed: reply.error !== undefined };
}

export const codexAccountProtocol: AccountUsageProtocol = {
  args: ['cli', 'app-server', '--listen', 'stdio://'],
  initialize: {
    id: 1,
    method: 'initialize',
    params: { clientInfo: { name: 'argo_usage', version: '1' } },
  },
  initialized: { method: 'initialized' },
  read: { id: 2, method: 'account/rateLimits/read' },
  response: codexResponse,
};

const ProviderConfig = z.object({
  model_provider: z.string().optional(),
  forced_chatgpt_workspace_id: z.string().optional(),
  forced_login_method: z.string().optional(),
});

function hasAccountOverride(config: string): boolean {
  try {
    const parsed = ProviderConfig.parse(JSON.parse(config));

    return Object.values(parsed).some(Boolean);
  } catch {
    return true;
  }
}

export function supportsCodexAccount(env: AgentLaunch['env']): boolean {
  if (env.MODEL_PROVIDER) return false;

  return !hasAccountOverride(env.CODEX_CONFIG ?? '{}');
}
