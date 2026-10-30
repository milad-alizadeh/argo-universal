import type { PermissionOption } from '@repo/contracts';
import type { RequestMock } from '@repo/mocks/app';
import {
  elicitationMock,
  permissionMock,
  recordedElicitation,
  recordedPermission,
} from '../../../../mocks/requests/recorded-requests';
import type {
  ElicitationFormProps,
  ElicitationValues,
} from './elicitation-form/elicitation-form';
import type { PermissionRequestProps } from './permission-request/permission-request';

export {
  configurationRequest,
  configurationValues,
  dateFormatsRequest,
  dateFormatsValues,
  emptyAnswersRequest,
  functionNameRequest,
  invalidSchemaRequest,
  refactorRequest,
} from '../../../../mocks/requests/elicitation-requests';

export {
  elicitationMock,
  elicitationMocks,
  elicitationRequest,
  permissionMocks,
} from '../../../../mocks/requests/recorded-requests';

type RecordedRow = RequestMock['pending']['rows'][number];

type ToolCallUpdate = Extract<
  RecordedRow,
  { sessionUpdate: 'tool_call_update' }
>;

type PermissionPropsInput = Partial<PermissionRequestProps> & {
  mock?: RequestMock;
};

function toolCallUpdate(
  mock: RequestMock,
  toolCallId: string,
): ToolCallUpdate | undefined {
  return mock.pending.rows.find(
    (row): row is ToolCallUpdate =>
      row.sessionUpdate === 'tool_call_update' && row.toolCallId === toolCallId,
  );
}

// The Agent's raw input, as the JSON it sent.
function rawInputText({ rawInput }: ToolCallUpdate): string | undefined {
  return rawInput === undefined ? undefined : JSON.stringify(rawInput, null, 2);
}

function recordedInput(row: ToolCallUpdate): string | undefined {
  const terminal = row.content.find((block) => block.type === 'terminal');

  return terminal?.command ?? rawInputText(row);
}

function recordedReason(row: ToolCallUpdate): string | undefined {
  return row._meta?.argo?.description;
}

type RecordedDetails = Pick<PermissionRequestProps, 'input' | 'reason'>;

function recordedDetails(row: ToolCallUpdate | undefined): RecordedDetails {
  if (!row) return { input: undefined, reason: undefined };

  return { input: recordedInput(row), reason: recordedReason(row) };
}

export function permissionProps({
  mock = permissionMock,
  ...props
}: PermissionPropsInput): PermissionRequestProps {
  const request = recordedPermission(mock);

  return {
    request,
    ...recordedDetails(toolCallUpdate(mock, request.toolCallId)),
    onAnswer: () => {},
    state: { kind: 'open' },
    ...props,
  };
}

type ElicitationPropsInput = Partial<ElicitationFormProps> & {
  mock?: RequestMock;
  values?: ElicitationValues;
};

export function elicitationProps({
  mock = elicitationMock,
  values,
  ...props
}: ElicitationPropsInput): ElicitationFormProps {
  return {
    request: props.request ?? recordedElicitation(mock),
    initialValues: values,
    onAnswer: () => {},
    state: { kind: 'open' },
    ...props,
  };
}

// ACP Agents name their own options and may offer more than one of a kind.
export const agentOptions: PermissionOption[] = [
  { optionId: 'allow-always', name: 'Always Allow', kind: 'allow_always' },
  { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
  { optionId: 'reject', name: 'Reject', kind: 'reject_once' },
];

export const agentOptionsWithAlwaysReject: PermissionOption[] = [
  ...agentOptions,
  { optionId: 'reject-always', name: 'Always Reject', kind: 'reject_always' },
];

export function agentOptionsProps({
  options = agentOptions,
  ...props
}: PermissionPropsInput & {
  options?: PermissionOption[];
}): PermissionRequestProps {
  const base = permissionProps(props);

  return { ...base, request: { ...base.request, options } };
}
