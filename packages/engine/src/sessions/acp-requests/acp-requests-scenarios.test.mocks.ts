import type { CreateElicitationResponse } from '@agentclientprotocol/sdk';
import type { FeedRowOutput, Notice } from '@repo/contracts';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import {
  type PromptSteps,
  type AcpEngine,
  type Outcomes,
  exactOptions,
  issueSchema,
  waitForPermission,
} from './acp-requests-shared.test.mocks';

export const answerLeavePlanMode = async (
  host: AcpEngine,
  sessionId: string,
  optionId: string,
): Promise<void> => {
  const { requestId } = await waitForPermission(host, sessionId);
  await host.caller.session.answerPermission({
    sessionId,
    requestId,
    optionId,
  });
  await waitForAcpSessionIdle(host, sessionId);
};

export const readNotices = async (
  host: AcpEngine,
  sessionId: string,
): Promise<Notice[]> =>
  (
    await host.caller.feed.page({ sessionId, direction: 'tail', limit: 40 })
  ).rows.filter((row): row is Notice => row.sessionUpdate === 'notice');

export const permissionSteps = (
  responses: Outcomes,
  toolCallIds: readonly string[],
): PromptSteps => [
  {
    type: 'parallel',
    steps: toolCallIds.map((toolCallId) => ({
      type: 'permission',
      request: {
        toolCall: { toolCallId, title: `Edit ${toolCallId}` },
        options: exactOptions,
      },
      responses,
    })),
  },
];

export const readToolCallUpdate = async (
  host: AcpEngine,
  sessionId: string,
  toolCallId: string,
): Promise<FeedRowOutput | undefined> =>
  (
    await host.caller.feed.page({ sessionId, direction: 'tail', limit: 40 })
  ).rows.find(
    (row) =>
      row.sessionUpdate === 'tool_call_update' && row.toolCallId === toolCallId,
  );

export const elicitationSteps = (
  responses: CreateElicitationResponse[],
  messages: readonly string[],
): PromptSteps => [
  {
    type: 'parallel',
    steps: messages.map((message) => ({
      type: 'elicitation',
      request: {
        mode: 'form',
        toolCallId: 'tool-a',
        message,
        requestedSchema: issueSchema,
      },
      responses,
    })),
  },
];
