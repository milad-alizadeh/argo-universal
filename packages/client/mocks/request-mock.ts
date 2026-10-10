import type { PendingElicitation, PermissionOption } from '@repo/contracts';
import { type RequestMock, recordedRequestMocks } from '@repo/mocks/app';
import type {
  ElicitationFormProps,
  ElicitationValues,
} from '../src/features/requests/components/elicitation-form';
import type { PermissionRequestProps } from '../src/features/requests/components/permission-request';
export const permissionMocks = recordedRequestMocks.filter(
  (mock) => mock.recording === 'permission',
);
export const elicitationMocks = recordedRequestMocks.filter(
  (mock) => mock.recording === 'elicitation',
);
function firstRecording(mocks: RequestMock[]): RequestMock {
  const mock = mocks[0];
  if (mock?.agent !== 'agent-1' || mocks[1]?.agent !== 'agent-2')
    throw new Error('Recorded catalog needs both Agents in recording order.');
  return mock;
}
export const permissionMock = firstRecording(permissionMocks);
export const elicitationMock = firstRecording(elicitationMocks);

const recordedElicitation = elicitationMock.pending.snapshot.pendingElicitation;
if (!recordedElicitation) throw new Error('Recording needs an Elicitation.');
export const elicitationRequest: PendingElicitation = recordedElicitation;

export const fieldsRequest: PendingElicitation = {
  ...elicitationRequest,
  message: 'A few details for the new issue',
  requestedSchema: {
    properties: {
      title: { type: 'string', title: 'Title', minLength: 1 },
      team: { type: 'string', title: 'Team', enum: ['Mobile', 'Desktop'] },
      estimate: { type: 'integer', title: 'Estimate', minimum: 1, maximum: 8 },
      notify: {
        type: 'boolean',
        title: 'Notify the team',
        description: "Posts the issue to the team's channel.",
      },
    },
    required: ['title'],
  },
};
export const fieldsValues: ElicitationValues = {
  title: 'Drafts vanish after a reconnect',
  team: 'Mobile',
  estimate: '12',
  notify: true,
};

export const emptyAnswersRequest: PendingElicitation = {
  ...fieldsRequest,
  requestedSchema: {
    properties: {
      options: {
        type: 'array',
        title: 'Options',
        minItems: 0,
        default: [],
        items: { type: 'string', enum: ['One'] },
      },
      choice: {
        type: 'string',
        title: 'Choice',
        oneOf: [
          { const: '', title: 'None' },
          { const: 'Blue', title: 'Blue' },
        ],
      },
      optional: { type: 'string', title: 'Optional' },
      'detail.name': { type: 'string', title: 'Detail', default: 'release' },
    },
    required: ['options', 'choice'],
  },
};
export const dateFormatsRequest: PendingElicitation = {
  ...fieldsRequest,
  requestedSchema: {
    properties: {
      date: { type: 'string', title: 'Date', format: 'date' },
      time: { type: 'string', title: 'Date and time', format: 'date-time' },
    },
    required: ['date', 'time'],
  },
};
export const dateFormatsValues: ElicitationValues = {
  date: '2026-02-30',
  time: '2026-10-06',
};
export const invalidSchemaRequest: PendingElicitation = {
  ...fieldsRequest,
  requestedSchema: {
    properties: { value: { type: 'string', title: 'Value', pattern: '[' } },
  },
};

export function permissionProps({
  mock = permissionMock,
  ...props
}: Partial<PermissionRequestProps> & {
  mock?: RequestMock;
}): PermissionRequestProps {
  const request = mock.pending.snapshot.pendingPermission;
  if (!request) throw new Error('Recording needs a Permission request.');
  const row = mock.pending.rows.find(
    (row) =>
      row.sessionUpdate === 'tool_call_update' &&
      row.toolCallId === request.toolCallId,
  );
  return {
    request,
    input:
      row?.sessionUpdate === 'tool_call_update'
        ? (row.content.find((block) => block.type === 'terminal')?.command ??
          (row.rawInput === undefined
            ? undefined
            : JSON.stringify(row.rawInput, null, 2)))
        : undefined,
    reason:
      row?.sessionUpdate === 'tool_call_update'
        ? row._meta?.argo?.description
        : undefined,
    onDenialMessageChange: () => {},
    onAnswer: () => {},
    state: { kind: 'open' },
    ...props,
  };
}
export function elicitationProps({
  mock = elicitationMock,
  values,
  ...props
}: Partial<ElicitationFormProps> & {
  mock?: RequestMock;
  values?: ElicitationValues;
}): ElicitationFormProps {
  const request = props.request ?? mock.pending.snapshot.pendingElicitation;
  if (!request) throw new Error('Recording needs an Elicitation.');
  return {
    request,
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
}: Parameters<typeof permissionProps>[0] & {
  options?: PermissionOption[];
}): PermissionRequestProps {
  const base = permissionProps(props);
  return { ...base, request: { ...base.request, options } };
}
