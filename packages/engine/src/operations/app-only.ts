import type { OperationId } from '@repo/contracts/operations';
import { TRPCError } from '@trpc/server';

/*
 * Operations only an App runs: the person's own Queued Prompts, and the Voice call, which carries the App's sound
 * and ends when its Connection does (ADR-0064). An Agent hangs up with `voice.hangUp`, and Agents and the CLI read
 * the Voice settings and change the voice and instructions the next call uses; turning Voice calls on or off and
 * choosing the provider stay the App's. No other caller sees these listed, and each refuses them.
 */
const appOnly: ReadonlySet<OperationId> = new Set<OperationId>([
  'session.submit',
  'session.queue',
  'voice.status',
  'voice.start',
  'voice.end',
  'voice.setSettings',
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
