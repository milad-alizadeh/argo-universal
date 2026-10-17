import type {
  CreateElicitationRequest,
  RequestPermissionRequest,
} from '@agentclientprotocol/sdk';
import {
  PendingElicitation,
  PendingPermission,
  type PermissionOption,
} from '@repo/contracts';
import { z } from 'zod';

export type AcpRequestIntake<Request> =
  | { type: 'presented'; request: Request }
  | { type: 'unsupported' }
  | { type: 'rejected'; reason: string };

type FormElicitation = Extract<CreateElicitationRequest, { mode: 'form' }>;

const parsed = <Request>(
  result: z.ZodSafeParseResult<Request>,
): AcpRequestIntake<Request> =>
  result.success
    ? { type: 'presented', request: result.data }
    : { type: 'rejected', reason: z.prettifyError(result.error) };

const toPermissionOptions = (
  options: RequestPermissionRequest['options'],
): PermissionOption[] =>
  options.map(({ optionId, name, kind }): PermissionOption => ({
    optionId,
    name,
    kind,
  }));

type PermissionToolCall = RequestPermissionRequest['toolCall'];

type ToolCallContent = NonNullable<PermissionToolCall['content']>[number];

const contentText = (item: ToolCallContent): string[] =>
  item.type === 'content' && item.content.type === 'text'
    ? [item.content.text]
    : [];

const switchModeText = ({ kind, content }: PermissionToolCall): string =>
  kind === 'switch_mode'
    ? (content ?? []).flatMap(contentText).join('\n\n')
    : '';

// A request to leave plan mode carries the plan as its Tool call's text content.
const planText = (
  toolCall: PermissionToolCall,
): Pick<PendingPermission, 'plan'> => {
  const plan = switchModeText(toolCall);

  return plan ? { plan } : {};
};

// ACP `session/request_permission`, presented with the Agent's exact options.
export const toPendingPermission = (
  requestId: string,
  { toolCall, options }: RequestPermissionRequest,
): AcpRequestIntake<PendingPermission> =>
  parsed(
    PendingPermission.safeParse({
      requestId,
      toolCallId: toolCall.toolCallId,
      title: toolCall.title ?? toolCall.name ?? toolCall.toolCallId,
      ...planText(toolCall),
      options: toPermissionOptions(options),
    }),
  );

const isFormElicitation = (
  params: CreateElicitationRequest,
): params is FormElicitation =>
  params.mode === 'form' && 'requestedSchema' in params;

const readToolCallId = (params: FormElicitation): { toolCallId?: string } =>
  'toolCallId' in params && typeof params.toolCallId === 'string'
    ? { toolCallId: params.toolCallId }
    : {};

// Argo does not open URL Elicitations; any other mode is unrecognised.
const refuseElicitation = (
  params: CreateElicitationRequest,
): AcpRequestIntake<PendingElicitation> =>
  params.mode === 'url'
    ? { type: 'unsupported' }
    : { type: 'rejected', reason: `Unknown Elicitation mode ${params.mode}` };

// ACP `elicitation/create`; only Session-scoped ones reach a Session.
export const toPendingElicitation = (
  requestId: string,
  params: CreateElicitationRequest,
): AcpRequestIntake<PendingElicitation> => {
  if (!isFormElicitation(params)) return refuseElicitation(params);

  return parsed(
    PendingElicitation.safeParse({
      requestId,
      mode: 'form',
      message: params.message,
      requestedSchema: params.requestedSchema,
      ...readToolCallId(params),
    }),
  );
};
