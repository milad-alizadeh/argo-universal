import type {
  SessionArchiveInput,
  SessionArchiveOutput,
} from '@repo/contracts';
import { operations } from '@repo/contracts/operations';
import { TRPCError } from '@trpc/server';
import type { OperationCard, OperationConsent, Sessions } from '../sessions';
import { requirePermissionTurn } from './operation-permission';

type ArchiveCaller = {
  sessionId: string;
  confirm: (card: OperationCard) => Promise<OperationConsent>;
};

export class OperationArchive {
  public constructor(private readonly sessions: Sessions['archives']) {}

  public async requireSafeForCli(input: SessionArchiveInput): Promise<void> {
    requireAgentArchiveInput(input);
    const risk = await this.sessions.inspect(input.sessionId, false);

    if (risk.kind === 'loss') requirePermissionTurn();
  }

  public readonly app = async (
    input: SessionArchiveInput,
  ): Promise<SessionArchiveOutput> => {
    const confirmation = await this.checkoutConfirmation(input);

    if (confirmation) return { checkoutConfirmation: confirmation };

    return input.inspectCheckout
      ? {}
      : this.sessions.archive(input.sessionId, input.checkoutApproval);
  };

  private async checkoutConfirmation(
    input: SessionArchiveInput,
  ): Promise<SessionArchiveOutput['checkoutConfirmation']> {
    const risk = await this.sessions.inspect(input.sessionId, false);

    if (risk.kind !== 'loss') return undefined;

    if (matchesApproval(input, risk.fingerprint)) return undefined;

    return { fingerprint: risk.fingerprint, reason: risk.reason };
  }

  public forSession(
    sessionId: string,
    call: Pick<ArchiveCaller, 'confirm'>,
  ): (input: SessionArchiveInput) => Promise<SessionArchiveOutput> {
    return (input) =>
      this.fromSession(input, {
        sessionId,
        confirm: (card) => call.confirm(card),
      });
  }

  private async fromSession(
    input: SessionArchiveInput,
    caller: ArchiveCaller,
  ): Promise<SessionArchiveOutput> {
    requireAgentArchiveInput(input);
    const own = input.sessionId === caller.sessionId;

    const fingerprint = await this.approvedFingerprint(
      input.sessionId,
      own,
      caller,
    );

    return own
      ? this.sessions.archiveOwn(input.sessionId, fingerprint)
      : this.sessions.archive(input.sessionId, fingerprint);
  }

  private async approvedFingerprint(
    sessionId: string,
    own: boolean,
    caller: ArchiveCaller,
  ): Promise<string | undefined> {
    const risk = await this.sessions.inspect(sessionId, own);

    if (risk.kind !== 'loss') return undefined;
    await caller.confirm({
      title: operations['session.archive'].label,
      description: risk.reason,
    });

    return risk.fingerprint;
  }
}

function requireAgentArchiveInput(input: SessionArchiveInput): void {
  if (input.inspectCheckout || input.checkoutApproval)
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Checkout confirmation requires an authenticated App action',
    });
}

const matchesApproval = (
  input: SessionArchiveInput,
  fingerprint: string,
): boolean => input.checkoutApproval === fingerprint && !input.inspectCheckout;
