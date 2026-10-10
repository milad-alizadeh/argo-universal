import type {
  CreateElicitationResponse,
  RequestPermissionResponse,
} from '@agentclientprotocol/sdk';
import type { PendingElicitation, PendingPermission } from '@repo/contracts';
import type { AcpSessionDestination } from '../../agents';
import {
  toPendingElicitation,
  toPendingPermission,
  type AcpRequestIntake,
} from './acp-request-intake';

export type AcpRequestEvent =
  | { type: 'acp.permissionRequested'; request: PendingPermission }
  | { type: 'acp.elicitationRequested'; request: PendingElicitation }
  // The Agent withdrew the request, or its ACP lifetime ended.
  | { type: 'acp.requestWithdrawn'; requestId: string }
  | { type: 'agent.messageRejected'; reason: string };
type Send = (event: AcpRequestEvent) => void;
type Waiting = {
  requestId: string;
  signal: AbortSignal;
  withdrawn: () => void;
};
type PresentInput<Request, Response> = {
  send: Send;
  signal: AbortSignal;
  intake: AcpRequestIntake<Request>;
  pending: PendingResponses<Response>;
  presented: (request: Request) => AcpRequestEvent;
};
type Pending<Response> = {
  resolve: (response: Response) => void;
  release: () => void;
};

// Live responses by Argo request id; each settles exactly once.
class PendingResponses<Response> {
  private readonly pending = new Map<string, Pending<Response>>();
  public constructor(public readonly cancelled: Response) {}
  public wait({ requestId, signal, withdrawn }: Waiting): Promise<Response> {
    const response = Promise.withResolvers<Response>();
    const withdraw = (): void => {
      if (this.settle(requestId, this.cancelled)) withdrawn();
    };
    signal.addEventListener('abort', withdraw, { once: true });
    this.pending.set(requestId, {
      resolve: response.resolve,
      release: () => signal.removeEventListener('abort', withdraw),
    });
    return response.promise;
  }
  public settle(requestId: string, response: Response): boolean {
    const pending = this.pending.get(requestId);
    this.pending.delete(requestId);
    pending?.release();
    pending?.resolve(response);
    return pending !== undefined;
  }
  public cancelAll(): void {
    for (const requestId of this.pending.keys())
      this.settle(requestId, this.cancelled);
  }
}

// The Permission requests and Elicitations an ACP Session holds open for the App.
export class AcpSessionRequests {
  private readonly permissions =
    new PendingResponses<RequestPermissionResponse>({
      outcome: { outcome: 'cancelled' },
    });
  private readonly elicitations =
    new PendingResponses<CreateElicitationResponse>({ action: 'cancel' });
  public constructor(private readonly createId: () => string) {}
  public requestPermission(
    send: Send,
  ): AcpSessionDestination['requestPermission'] {
    return ({ params, signal }) =>
      this.present({
        send,
        signal,
        intake: toPendingPermission(this.createId(), params),
        pending: this.permissions,
        presented: (request) => ({ type: 'acp.permissionRequested', request }),
      });
  }
  public createElicitation(
    send: Send,
  ): AcpSessionDestination['createElicitation'] {
    return ({ params, signal }) =>
      this.present({
        send,
        signal,
        intake: toPendingElicitation(this.createId(), params),
        pending: this.elicitations,
        presented: (request) => ({ type: 'acp.elicitationRequested', request }),
      });
  }
  private present<Request extends { requestId: string }, Response>(
    input: PresentInput<Request, Response>,
  ): Promise<Response> {
    const { intake, pending, send } = input;
    if (intake.type !== 'presented' || input.signal.aborted)
      return this.refuse(intake, input);
    const { requestId } = intake.request;
    const response = pending.wait({
      requestId,
      signal: input.signal,
      withdrawn: (): void => send({ type: 'acp.requestWithdrawn', requestId }),
    });
    send(input.presented(intake.request));
    return response;
  }
  private refuse<Request, Response>(
    intake: AcpRequestIntake<Request>,
    { send, pending }: PresentInput<Request, Response>,
  ): Promise<Response> {
    if (intake.type === 'rejected')
      send({ type: 'agent.messageRejected', reason: intake.reason });
    return Promise.resolve(pending.cancelled);
  }
  // A null option cancels the request.
  public answerPermission(requestId: string, optionId: string | null): void {
    this.permissions.settle(
      requestId,
      optionId === null
        ? this.permissions.cancelled
        : { outcome: { outcome: 'selected', optionId } },
    );
  }
  public answerElicitation(
    requestId: string,
    response: CreateElicitationResponse,
  ): void {
    this.elicitations.settle(requestId, response);
  }
  public cancel(requestId: string): void {
    this.permissions.settle(requestId, this.permissions.cancelled);
    this.elicitations.settle(requestId, this.elicitations.cancelled);
  }
  // Ends every live request, as at Turn end or Session close.
  public cancelAll(): void {
    this.permissions.cancelAll();
    this.elicitations.cancelAll();
  }
}
