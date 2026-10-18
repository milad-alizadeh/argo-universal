import type { PendingPermission, PermissionOption } from '@repo/contracts';
import type { CoreHooks, HookAnswer } from '@repo/contracts/plugins';
import { fromPromise, type AnyActorRef } from 'xstate';

export const permissionHookedEvent = 'session.permissionHooked';

// How a Permission request's `tool.call` Hooks ended: the option they chose, null to cancel as a person may, or no answer to leave it to the person.
export type PermissionHooked = {
  type: typeof permissionHookedEvent;
  requestId: string;
  answer: { optionId: string | null } | null;
};

// Each request's Hooks run as their own child, stopped once they answer.
export const toolCallHooksId = (requestId: string): string =>
  `toolCallHooks:${requestId}`;

type Decision = HookAnswer<'tool.call'>['decision'];

// The Agent's own options carry the answer: a one-time choice first, then a lasting one.
const optionKinds: Record<
  Exclude<Decision, 'ask'>,
  PermissionOption['kind'][]
> = {
  allow: ['allow_once', 'allow_always'],
  deny: ['reject_once', 'reject_always'],
};

// A denial with no reject option cancels the request instead, which the Agent also reads as no.
function decidedOption(
  { options }: PendingPermission,
  decision: Exclude<Decision, 'ask'>,
): string | null {
  const option = optionKinds[decision]
    .map((kind) => options.find((offered) => offered.kind === kind))
    .find((offered) => offered !== undefined);

  return option?.optionId ?? null;
}

type PermissionHookInput = {
  hooks: CoreHooks;
  sessionId: string;
  request: PendingPermission;
  // The Session the answer goes back to.
  session: Pick<AnyActorRef, 'send'>;
};

// Runs `tool.call` Hooks on one Permission request and reports how they ended.
export const toolCallHooks = fromPromise<void, PermissionHookInput>(
  async ({ input: { hooks, sessionId, request, session } }) => {
    const { decision } = await hooks['tool.call']({ sessionId, request });

    session.send({
      type: permissionHookedEvent,
      requestId: request.requestId,
      answer:
        decision === 'ask'
          ? null
          : { optionId: decidedOption(request, decision) },
    });
  },
);
