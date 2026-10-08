import { type RequestMock, recordedRequestMocks } from '@repo/api/mocks';
import type { PendingElicitation } from '@repo/contracts';
import type * as React from 'react';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { CommandRow } from '../src/components/command-row';
import { Composer, type ComposerDraft } from '../src/components/composer';
import {
  type ElicitationAnswer,
  ElicitationForm,
  type ElicitationValues,
} from '../src/components/elicitation-form';
import { ElicitationOutcome } from '../src/components/elicitation-outcome';
import { PermissionOutcome } from '../src/components/permission-outcome';
import {
  type PermissionAnswer,
  PermissionRequest,
} from '../src/components/permission-request';
import type { RequestState } from '../src/components/request-card';
import { ToolCallGroup } from '../src/components/tool-call-group';
import { ToolCallRow } from '../src/components/tool-call-row';
import { toFeedView } from '../src/feed/to-feed-view';

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

export const recordedElicitation =
  elicitationMock.pending.snapshot.pendingElicitation;
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

export function RequestFrame({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <View className="w-full items-center p-4 wide:px-6">
      <View className="w-full max-w-composer">{children}</View>
    </View>
  );
}

function ResumedComposer(): React.JSX.Element {
  const [draft, setDraft] = useState<ComposerDraft>({ text: '', images: [] });
  return (
    <Composer
      draft={draft}
      onDraftChange={setDraft}
      onAttachImages={() => {}}
      onSend={() => setDraft({ text: '', images: [] })}
    />
  );
}

export function PermissionRequestPreview({
  denialMessage: initialMessage,
  state = { kind: 'open' },
  error,
  mock = permissionMock,
  onAnswer,
}: {
  denialMessage?: string;
  state?: RequestState;
  error?: string;
  mock?: RequestMock;
  onAnswer?: (answer: PermissionAnswer) => void;
}): React.JSX.Element {
  const [denialMessage, setDenialMessage] = useState(initialMessage);
  const [answer, setAnswer] = useState<PermissionAnswer>();
  const request = mock.pending.snapshot.pendingPermission;
  if (!request) throw new Error('Recording needs a Permission request.');
  const row = mock.pending.rows.find(
    (row) =>
      row.sessionUpdate === 'tool_call_update' &&
      row.toolCallId === request.toolCallId,
  );
  const input =
    row?.sessionUpdate === 'tool_call_update'
      ? (row.content.find((block) => block.type === 'terminal')?.command ??
        (row.rawInput === undefined
          ? undefined
          : JSON.stringify(row.rawInput, null, 2)))
      : undefined;
  return (
    <RequestFrame>
      {answer ? (
        <View className="gap-8">
          <PermissionOutcome
            outcome={{ outcome: 'selected', optionId: answer.optionId }}
            message={answer.message}
          />
          <ResumedComposer />
        </View>
      ) : (
        <PermissionRequest
          request={request}
          input={input}
          reason={
            row?.sessionUpdate === 'tool_call_update'
              ? row._meta?.argo?.description
              : undefined
          }
          denialMessage={denialMessage}
          onDenialMessageChange={setDenialMessage}
          onAnswer={(next) => {
            onAnswer?.(next);
            setAnswer(next);
          }}
          state={state}
          error={error}
        />
      )}
    </RequestFrame>
  );
}

export function ElicitationFormPreview({
  request: suppliedRequest,
  mock = elicitationMock,
  values: initialValues = {},
  state = { kind: 'open' },
  error,
  source,
  onAnswer,
}: {
  request?: PendingElicitation;
  mock?: RequestMock;
  values?: ElicitationValues;
  state?: RequestState;
  error?: string;
  source?: string;
  onAnswer?: (answer: ElicitationAnswer) => void;
}): React.JSX.Element {
  const request = suppliedRequest ?? mock.pending.snapshot.pendingElicitation;
  if (!request) throw new Error('Recording needs an Elicitation.');
  const [answer, setAnswer] = useState<ElicitationAnswer>();
  return (
    <RequestFrame>
      {answer ? (
        <View className="gap-8">
          <ElicitationOutcome request={request} answer={answer} />
          <ResumedComposer />
        </View>
      ) : (
        <ElicitationForm
          request={request}
          initialValues={initialValues}
          onAnswer={(next) => {
            onAnswer?.(next);
            setAnswer(next);
          }}
          source={source}
          state={state}
          error={error}
        />
      )}
    </RequestFrame>
  );
}

export function PermissionFeedPreview({
  mock = permissionMock,
  answered = false,
}: {
  mock?: RequestMock;
  answered?: boolean;
}): React.JSX.Element {
  const state = answered ? mock.answered : mock.pending;
  const groups = toFeedView(state.rows, state.snapshot).items.filter(
    (item) => item.type === 'group',
  );
  return (
    <View className="w-full gap-4">
      {groups.map((group) => (
        <ToolCallGroup
          key={group.id}
          group={group}
          renderActivity={(activity) => {
            if (activity.type !== 'tool_call') return null;
            return activity.row.content.some(
              (block) => block.type === 'terminal',
            ) ? (
              <CommandRow
                row={activity.row}
                awaitingApproval={activity.awaitingApproval}
              />
            ) : (
              <ToolCallRow
                row={activity.row}
                awaitingApproval={activity.awaitingApproval}
              />
            );
          }}
        />
      ))}
    </View>
  );
}
