import type { LiveHeader, ToolCallUpdate } from '@repo/contracts';
import { recordedFeedMocks } from '@repo/mocks/app';

// Every live header the Server's producer gave over the recorded Turns, once per text.
export const liveHeaderSteps = recordedFeedMocks
  .flatMap((mock) =>
    mock.liveHeaders.map((liveHeader) => ({
      step: `${mock.agent} ${mock.recording}: ${liveHeader.text}`,
      liveHeader,
      toolCall: toolCallFor(liveHeader, mock.rows),
    })),
  )
  .filter(
    (step, index, steps) =>
      steps.findIndex(
        (other) => other.liveHeader.text === step.liveHeader.text,
      ) === index,
  );

function toolCallFor(
  liveHeader: LiveHeader,
  rows: (typeof recordedFeedMocks)[number]['rows'],
): ToolCallUpdate | undefined {
  const { source } = liveHeader;
  if (source.type !== 'tool_call') return;
  return rows.findLast(
    (row): row is ToolCallUpdate =>
      row.sessionUpdate === 'tool_call_update' &&
      row.toolCallId === source.toolCallId,
  );
}

const startedAt = liveHeaderSteps[0]?.liveHeader.startedAt;
if (!startedAt) throw new Error('Recordings need a running Turn');

// 2m 14s into the recorded Turns, so every step shows the same elapsed time.
export const liveHeaderElapsed = '2m 14s';
export const liveHeaderNow = startedAt + 134_000;

export const workingHeader =
  liveHeaderSteps.find((step) => step.liveHeader.source.type === 'working')
    ?.liveHeader ?? missingStep('working');
export const requestHeader =
  liveHeaderSteps.find((step) => step.liveHeader.source.type === 'request')
    ?.liveHeader ?? missingStep('request');
export const retryHeader =
  liveHeaderSteps.find((step) => step.liveHeader.source.type === 'retry')
    ?.liveHeader ?? missingStep('retry');

function missingStep(type: string): never {
  throw new Error(`Recordings need a ${type} live header`);
}
