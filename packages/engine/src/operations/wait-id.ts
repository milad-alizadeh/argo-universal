import { createHmac } from 'node:crypto';
import { OperationWaitId } from '@repo/contracts/operations';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { OperationCaller } from './session-tokens';
import { tokensMatch } from './tokens';

const Identity = z.tuple([z.string(), z.string(), z.string()]);

const Parts = z.tuple([z.enum(['turn', 'call']), z.string(), z.string()]);

type WaitParts = z.infer<typeof Parts>;

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
    const parts = Parts.parse(OperationWaitId.parse(value).split(':'));
    this.requireSignature(parts);
    const [owner, sessionId, entityId] = decodeIdentity(parts[1]);
    requireOwner(caller, owner);

    return { kind: parts[0], sessionId, entityId };
  }
  private requireSignature([kind, body, signature]: WaitParts): void {
    if (!tokensMatch(this.signature(`${kind}:${body}`), signature))
      invalidWaitId();
  }
  private signature(payload: string): string {
    return createHmac('sha256', this.secret).update(payload).digest('hex');
  }
}

function decodeIdentity(body: string): z.infer<typeof Identity> {
  try {
    return Identity.parse(
      JSON.parse(Buffer.from(body, 'base64url').toString('utf8')),
    );
  } catch {
    return invalidWaitId();
  }
}

function invalidWaitId(): never {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Invalid Operation wait id',
  });
}

function requireOwner(caller: OperationCaller, owner: string): void {
  if (caller.kind === 'user') return;

  if (owner !== caller.sessionId)
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'This Operation wait id belongs to another caller',
    });
}
