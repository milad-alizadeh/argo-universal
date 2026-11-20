import type { OperationId } from '@repo/contracts/operations';
import { TRPCError } from '@trpc/server';

/*
 * Operations only an App runs: the person's own Queued Prompts, and the Conversation, which carries the App's sound
 * and ends when its Connection does (ADR-0064). An Agent hangs up with `conversation.hangUp`, and Agents and the CLI read
 * the Conversation settings and change the voice and instructions the next call uses; turning Conversations on or off and
 * choosing the provider stay the App's. No other caller sees these listed, and each refuses them.
 */
const appOnly: ReadonlySet<OperationId> = new Set<OperationId>([
  'session.submit',
  'session.queue',
  'conversation.status',
  'conversation.start',
  'conversation.end',
  'conversation.setSettings',
  'voice.preview',
  'voice.getPreviewClip',
  'voice.storePreviewClip',
]);

export const isAppOnly = (id: OperationId): boolean => appOnly.has(id);

export const appOnlyRefusal = (id: OperationId): TRPCError =>
  new TRPCError({ code: 'FORBIDDEN', message: `Only an App can run ${id}` });

type Caller = { kind: string; id: OperationId };

export function requireAppCaller(caller: Caller): void {
  if (caller.kind !== 'app' && isAppOnly(caller.id))
    throw appOnlyRefusal(caller.id);
}
