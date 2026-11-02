import { writeFileSync } from 'node:fs';
import type { SessionUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from './acp-engine';
import { reportRecordingScenario } from './report-recording-scenario';

type ReportRecording = {
  provenance: string;
  parentSessionId: string;
  childSessionId: string;
  parent: SessionUpdate[];
  child: SessionUpdate[];
};

async function openRecordingSession(): Promise<RecordedSession> {
  const host = await startAcpEngine({
    ...reportRecordingScenario,
    steps: [...reportRecordingScenario.steps, { type: 'wait-for-cancel' }],
  });

  const { sessionId } = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Show the result' }],
  });

  return { host, sessionId };
}

type RecordedSession = {
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  sessionId: string;
};

const rowsOf = async (
  { host }: RecordedSession,
  sessionId: string,
): Promise<SessionUpdate[]> =>
  (await host.caller.feed.page({ sessionId, direction: 'tail', limit: 200 }))
    .rows;

function reportedChild(rows: SessionUpdate[]): string {
  const result = rows
    .filter((row) => row.sessionUpdate === 'subagent_update')
    .find((row) => row._meta?.argo?.result);

  if (result?.sessionUpdate !== 'subagent_update')
    throw new Error('Missing recorded report');

  return result.subagentSessionId;
}

function assertChildReply(child: SessionUpdate[]): void {
  expect(child.some((row) => row.sessionUpdate === 'session_message')).toBe(
    true,
  );
}

async function waitForRecordedTools(session: RecordedSession): Promise<void> {
  await expect
    .poll(() => rowsOf(session, session.sessionId), { timeout: 15_000 })
    .toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          toolCallId: 'move-raw',
          status: 'in_progress',
        }),
      ]),
    );
}

async function capture(): Promise<ReportRecording> {
  const session = await openRecordingSession();

  await waitForRecordedTools(session);
  const parent = await rowsOf(session, session.sessionId);
  const childSessionId = reportedChild(parent);
  const child = await rowsOf(session, childSessionId);

  assertChildReply(child);
  await session.host.caller.session.cancel({ sessionId: session.sessionId });

  return recordingOf(
    { sessionId: session.sessionId, childSessionId },
    parent,
    child,
  );
}

function recordingOf(
  ids: { sessionId: string; childSessionId: string },
  parent: SessionUpdate[],
  child: SessionUpdate[],
): ReportRecording {
  return {
    provenance:
      'Scripted ACP Agent through real Engine and feed.page; not a Claude capture',
    parentSessionId: ids.sessionId,
    childSessionId: ids.childSessionId,
    parent,
    child,
  };
}

it('records the scripted ACP report and generic Tool calls through the Engine', async () => {
  expect.assertions(2);

  const recording = await capture();

  writeFileSync(
    new URL('../../../mocks/app/report-recording.json', import.meta.url),
    `${JSON.stringify(recording, null, 2)}\n`,
  );
});
