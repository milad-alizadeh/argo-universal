import { createHmac } from 'node:crypto';
import { OperationWaitId } from '@repo/contracts/operations';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { OperationCaller } from './session-tokens';
import { tokensMatch } from './tokens';

const Identity = z.tuple([z.string(), z.string(), z.string()]);

export type NativeWork = {
  kind: 'turn' | 'call';
  sessionId: string;
  entityId: string;
};

export class WaitIds {
  public constructor(private readonly secret: string) {}
  public issue(caller: OperationCaller, work: NativeWork): string {
    const owner = caller.kind === 'user' ? 'user' : caller.sessionId;
    const body = Buffer.from(
      JSON.stringify([owner, work.sessionId, work.entityId]),
    ).toString('base64url');
    const payload = `${work.kind}:${body}`;
    return `${payload}:${this.signature(payload)}`;
  }
  public require(caller: OperationCaller, value: string): NativeWork {
    const [kind, body, signature] = OperationWaitId.parse(value).split(':');
    if (
      !body ||
      !signature ||
      (kind !== 'turn' && kind !== 'call') ||
      !tokensMatch(this.signature(`${kind}:${body}`), signature)
    )
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid Operation wait id',
      });
    const parsed = Identity.safeParse(
      JSON.parse(Buffer.from(body, 'base64url').toString('utf8')),
    );
    if (!parsed.success)
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid Operation wait id',
      });
    const [owner, sessionId, entityId] = parsed.data;
    if (caller.kind === 'session' && owner !== caller.sessionId)
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'This Operation wait id belongs to another caller',
      });
    return { kind, sessionId, entityId };
  }
  private signature(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('hex');
  }
}
