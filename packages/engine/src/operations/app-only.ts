import type { OperationId } from '@repo/contracts/operations';
import { TRPCError } from '@trpc/server';

/*
 * Operations only an App runs: the person's own Queued Prompts, and the Voice call, which carries the App's sound
 * and ends when its Connection does (ADR-0063). An Agent hangs up with `voice.hangUp`, the one Voice call Operation
 * it is given. No other caller sees these listed, and each refuses them.
 */
const appOnly: ReadonlySet<string> = new Set([
  'session.submit',
  'session.queue',
  'voice.status',
  'voice.start',
  'voice.end',
  'voice.getSettings',
  'voice.setSettings',
  'voice.preview',
] satisfies OperationId[]);

export const isAppOnly = (id: string): boolean => appOnly.has(id);

export const appOnlyRefusal = (id: OperationId): TRPCError =>
  new TRPCError({ code: 'FORBIDDEN', message: `Only an App can run ${id}` });

type Caller = { kind: string; id: OperationId };

export function requireAppCaller(caller: Caller): void {
  if (caller.kind !== 'app' && isAppOnly(caller.id))
    throw appOnlyRefusal(caller.id);
}
