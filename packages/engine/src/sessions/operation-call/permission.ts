import {
  permissionOptions,
  type PendingPermission,
  type PermissionOption,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { nativePermissionOutcomeEvent } from '../../feed';
import { nativePermissionEvent } from '../native-permissions';
import { operationRowId } from './rows';
import { canConfirmCall, type CallSite } from './turn';

/*
 * What the Permission request card says: the Operation's label, and what will happen. `alwaysAllow` also offers
 * Always allow, for an Operation whose caller records that choice.
 */
export type OperationCard = {
  title: string;
  description: string;
  alwaysAllow?: boolean;
};

// How the person allowed the call: this once, or from now on.
export type OperationConsent = 'once' | 'always';

const alwaysAllow: PermissionOption = {
  optionId: 'allow_always',
  name: 'Always allow',
  kind: 'allow_always',
};

const [allowOnce, ...rejections] = permissionOptions;

const offeredOptions = ({
  alwaysAllow: always,
}: OperationCard): PermissionOption[] =>
  always && allowOnce
    ? [allowOnce, alwaysAllow, ...rejections]
    : permissionOptions;

type ConfirmingCall = CallSite & { toolCallId: string };

type TurnCall = ConfirmingCall & { turnId: string };

type Confirmed = { name: string; input: string; card: OperationCard };

export async function confirmOperation(
  call: ConfirmingCall,
  operation: Confirmed,
): Promise<OperationConsent> {
  requireCallingTurn(call);
  const consent = requireAllowed(await ask(call, operation));
  requireCallingTurn(call);

  return consent;
}

// Raises Argo's own Permission request in the calling Turn and waits for the user's option.
function ask(call: TurnCall, operation: Confirmed): Promise<string | null> {
  const request = permissionRequest(call.session.createId(), call, operation);
  const answer = answered(call, request);
  call.session.send({
    type: nativePermissionEvent,
    turnId: call.turnId,
    request,
  });

  return answer;
}

// The answer settles the call's Tool call row before the call goes on.
function answered(
  call: ConfirmingCall,
  { requestId, options }: PendingPermission,
): Promise<string | null> {
  const answer = Promise.withResolvers<string | null>();
  call.session.onAnswer(requestId, (optionId) => {
    publishOutcome(call, options, optionId);
    answer.resolve(optionId);
  });

  return answer.promise;
}

function requireAllowed(option: string | null): OperationConsent {
  if (option === null)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'The Permission request was cancelled',
    });

  if (option === alwaysAllow.optionId) return 'always';

  if (option !== 'allow_once')
    throw new TRPCError({ code: 'FORBIDDEN', message: 'The user refused' });

  return 'once';
}

function requireCallingTurn(call: ConfirmingCall): asserts call is TurnCall {
  if (!canConfirmCall(call))
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'A Permission request requires an active Turn',
    });
}

const permissionRequest = (
  requestId: string,
  call: ConfirmingCall,
  { name, input, card }: Confirmed,
): PendingPermission => ({
  requestId,
  toolCallId: call.toolCallId,
  title: card.title,
  operation: { id: name, description: card.description, input },
  options: offeredOptions(card),
});

function publishOutcome(
  call: ConfirmingCall,
  options: PermissionOption[],
  optionId: string | null,
): void {
  call.feed.send({
    type: nativePermissionOutcomeEvent,
    turnId: call.turnId,
    rowId: operationRowId(call.toolCallId),
    option: options.find((item) => item.optionId === optionId),
  });
}
