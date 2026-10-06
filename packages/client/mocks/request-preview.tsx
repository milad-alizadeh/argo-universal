import { type RequestMock, recordedRequestMocks } from '@repo/api/mocks';
import type { PendingElicitation } from '@repo/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { useSubscription } from '@trpc/tanstack-react-query';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { Composer, type ComposerDraft } from '../src/components/Composer';
import {
  type ElicitationAnswer,
  ElicitationForm,
  type ElicitationValues,
} from '../src/components/ElicitationForm';
import { ElicitationOutcome } from '../src/components/ElicitationOutcome';
import { PermissionOutcome } from '../src/components/PermissionOutcome';
import {
  type PermissionAnswer,
  PermissionRequest,
} from '../src/components/PermissionRequest';
import { ToolCallRow } from '../src/components/ToolCallRow';
import { toFeedView } from '../src/feed/to-feed-view';
import { useTRPC } from '../src/trpc/context';
import { createFeedMocks } from './feed-mock';
import type { Fixtures } from './trpc-mock-link';

export const permissionMocks = recordedRequestMocks.filter(
  (mock) => mock.recording === 'permission',
);
export const elicitationMocks = recordedRequestMocks.filter(
  (mock) => mock.recording === 'elicitation',
);
function firstRecording(mocks: RequestMock[]): RequestMock {
  const mock = mocks[0];
  if (!mock) throw new Error('Request previews need the #54 recordings.');
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

export function RequestFrame({ children }: { children: ReactNode }) {
  return (
    <View className="w-full items-center p-4 wide:px-6">
      <View className="w-full max-w-composer">{children}</View>
    </View>
  );
}

function ResumedComposer() {
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
  alreadyAnswered,
  submitting,
  onAnswer,
}: {
  denialMessage?: string;
  alreadyAnswered?: string;
  submitting?: boolean;
  onAnswer?: (answer: PermissionAnswer) => void;
}) {
  const [denialMessage, setDenialMessage] = useState(initialMessage);
  const [answer, setAnswer] = useState<PermissionAnswer>();
  const request = permissionMock.pending.snapshot.pendingPermission;
  if (!request) throw new Error('Recording needs a Permission request.');
  const row = permissionMock.pending.rows.find(
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
          alreadyAnswered={alreadyAnswered}
          submitting={submitting}
        />
      )}
    </RequestFrame>
  );
}

export function ElicitationFormPreview({
  request = elicitationRequest,
  values: initialValues = {},
  alreadyAnswered,
  source,
  onAnswer,
}: {
  request?: PendingElicitation;
  values?: ElicitationValues;
  alreadyAnswered?: string;
  source?: string;
  onAnswer?: (answer: ElicitationAnswer) => void;
}) {
  const [values, setValues] = useState(initialValues);
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
          values={values}
          onValuesChange={setValues}
          onAnswer={(next) => {
            onAnswer?.(next);
            setAnswer(next);
          }}
          source={source}
          alreadyAnswered={alreadyAnswered}
        />
      )}
    </RequestFrame>
  );
}

export function createRequestFixtures(
  mock: RequestMock,
  conflict = false,
): Fixtures & { reset: () => void } {
  let state = mock.pending;
  const feedMocks = () =>
    createFeedMocks({
      agent: mock.agent,
      recording: mock.recording,
      rows: state.rows,
      snapshot: state.snapshot,
      stream: [],
      liveHeaders: [],
    });
  const answer = () => {
    if (conflict)
      throw TRPCClientError.from({
        error: {
          message: 'Already answered on another device',
          code: -32009,
          data: { code: 'CONFLICT', httpStatus: 409 },
        },
      });
    state = mock.answered;
    return {};
  };
  return {
    reset: () => {
      state = mock.pending;
    },
    'feed.page': (input, signal) => {
      const page = feedMocks()['feed.page'];
      if (!page) throw new Error('Recording needs a Feed page.');
      return page(input, signal);
    },
    'feed.subscribe': async function* () {
      yield { type: 'snapshot', snapshot: state.snapshot };
    },
    'session.answerPermission': (input) => {
      if (
        input.sessionId !== mock.answer.input.sessionId ||
        input.toolCallId !== mock.pending.snapshot.pendingPermission?.toolCallId
      )
        throw new Error('Answer must address the recorded Permission request.');
      return answer();
    },
    'session.answerElicitation': (input) => {
      if (
        input.sessionId !== mock.answer.input.sessionId ||
        input.requestId !== mock.pending.snapshot.pendingElicitation?.requestId
      )
        throw new Error('Answer must address the recorded Elicitation.');
      return answer();
    },
  };
}

// A request region on recorded data; the complete Session screen belongs to #52.
export function RequestAnsweringPreview({ mock }: { mock: RequestMock }) {
  const trpc = useTRPC();
  const sessionId = mock.answer.input.sessionId;
  const page = useQuery(
    trpc.feed.page.queryOptions({ sessionId, direction: 'before' }),
  );
  const subscription = useSubscription(
    trpc.feed.subscribe.subscriptionOptions({ sessionId, after: null }),
  );
  const [elicitationAnswer, setElicitationAnswer] =
    useState<ElicitationAnswer>();
  const [denialMessage, setDenialMessage] = useState<string>();
  const [values, setValues] = useState<ElicitationValues>({});
  const permission = useMutation(
    trpc.session.answerPermission.mutationOptions({
      onSuccess: () => void page.refetch(),
    }),
  );
  const elicitation = useMutation(
    trpc.session.answerElicitation.mutationOptions({
      onSuccess: () => void page.refetch(),
    }),
  );
  const snapshot =
    subscription.data?.type === 'snapshot'
      ? subscription.data.snapshot
      : undefined;
  if (!snapshot || !page.data) return null;
  const request = snapshot.pendingPermission;
  const form = snapshot.pendingElicitation;
  const answered = permission.isSuccess || elicitation.isSuccess;
  const error = permission.error ?? elicitation.error;
  const conflict = error?.data?.code === 'CONFLICT' ? error.message : undefined;
  const displayedRows = toFeedView(
    page.data.rows,
    answered ? mock.answered.snapshot : snapshot,
  ).items.flatMap((item) => (item.type === 'group' ? item.items : [item]));
  let bottom: ReactNode = <ResumedComposer />;
  if (!answered && request) {
    bottom = (
      <PermissionRequest
        request={request}
        denialMessage={denialMessage}
        onDenialMessageChange={setDenialMessage}
        submitting={permission.isPending}
        alreadyAnswered={conflict}
        error={conflict ? undefined : error?.message}
        onAnswer={(answer) => {
          permission.mutate({
            sessionId,
            toolCallId: request.toolCallId,
            ...answer,
          });
        }}
      />
    );
  } else if (!answered && form) {
    bottom = (
      <ElicitationForm
        request={form}
        values={values}
        onValuesChange={setValues}
        submitting={elicitation.isPending}
        alreadyAnswered={conflict}
        error={conflict ? undefined : error?.message}
        onAnswer={(answer) => {
          setElicitationAnswer(answer);
          elicitation.mutate({
            sessionId,
            requestId: form.requestId,
            ...answer,
          });
        }}
      />
    );
  }
  return (
    <RequestFrame>
      <View className="gap-8">
        <View className="gap-3">
          {displayedRows.flatMap((item) =>
            item.type === 'tool_call'
              ? [<ToolCallRow key={item.row.id} row={item.row} />]
              : [],
          )}
          {elicitation.isSuccess && form && elicitationAnswer && (
            <ElicitationOutcome request={form} answer={elicitationAnswer} />
          )}
        </View>
        {bottom}
      </View>
    </RequestFrame>
  );
}
