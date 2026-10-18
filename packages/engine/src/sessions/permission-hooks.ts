import type { PendingPermission, PermissionOption } from '@repo/contracts';
import type { CoreHooks, HookAnswer } from '@repo/contracts/plugins';
import { fromCallback, type EventObject } from 'xstate';

export const permissionHookedEvent = 'session.permissionHooked';

// A `tool.call` Hook's answer for one Permission request; `optionId` null cancels it, as a person may.
export type PermissionHooked = {
  type: typeof permissionHookedEvent;
  requestId: string;
  optionId: string | null;
};

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
};

// Runs `tool.call` Hooks on one Permission request; an `ask` leaves it to the person.
export const toolCallHooks = fromCallback<EventObject, PermissionHookInput>(
  ({ input: { hooks, sessionId, request }, sendBack }) => {
    void hooks['tool.call']({ sessionId, request }).then(({ decision }) => {
      if (decision === 'ask') return;

      sendBack({
        type: permissionHookedEvent,
        requestId: request.requestId,
        optionId: decidedOption(request, decision),
      });
    });
  },
);
