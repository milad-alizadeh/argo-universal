import type { PluginValue } from '../protocol/runtime';
import type { PluginCall } from './plugin-calls';

// `argo.sessions.get` reads a Session's Project and branch only under a `sessions:read` Grant (ADR-0030).
export async function answerSession(
  call: PluginCall,
  { sessionId }: { sessionId: string },
): Promise<PluginValue> {
  call.access().checkSessionsRead();
  call.logCall();

  return (await call.options.sessionInfo?.(sessionId)) ?? null;
}
