import { createHmac, randomUUID } from 'node:crypto';
import { OperationWaitId } from '@repo/contracts/operations';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { SessionWork } from '../../sessions';
import type { OperationCaller } from '../session-tokens';
import { tokensMatch } from '../tokens';

const Identity = z.tuple([
  z.string(),
  z.string(),
  z.string(),
  z.string().optional(),
]);

const Parts = z.tuple([
  z.enum(['creation', 'turn', 'call']),
  z.string(),
  z.string(),
]);

type WaitParts = z.infer<typeof Parts>;

// A wait id names one caller's native Session work, signed with the control token; a Session opening's id also names this Engine.
export class WaitIds {
  private readonly epoch = randomUUID();
  public constructor(private readonly secret: string) {}
  public issue(caller: OperationCaller, work: SessionWork): string {
    const owner = caller.kind === 'user' ? 'user' : caller.sessionId;

    const identity = [owner, work.sessionId, work.entityId];

    if (work.kind === 'creation') identity.push(this.epoch);
    const body = Buffer.from(JSON.stringify(identity)).toString('base64url');

    const payload = `${work.kind}:${body}`;

    return `${payload}:${this.signature(payload)}`;
  }
  public require(caller: OperationCaller, value: string): SessionWork {
    const parts = Parts.parse(OperationWaitId.parse(value).split(':'));
    this.requireSignature(parts);
    const [owner, sessionId, entityId, epoch] = decodeIdentity(parts[1]);
    this.requireEpoch(parts[0], epoch);
    requireOwner(caller, owner);

    return { kind: parts[0], sessionId, entityId };
  }
  private requireSignature([kind, body, signature]: WaitParts): void {
    if (!tokensMatch(this.signature(`${kind}:${body}`), signature))
      invalidWaitId();
  }
  private requireEpoch(
    kind: SessionWork['kind'],
    epoch: string | undefined,
  ): void {
    if (kind !== 'creation') return;

    if (epoch !== this.epoch)
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'This Session opening belongs to a previous Engine',
      });
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
