import { permissionOptions } from '@repo/contracts';
import { expect, it } from 'vitest';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { liveHeaderMocks } from '#mocks/live-header';
import {
  readLiveHeader,
  publishStoredHeader,
  startLiveHeaderHost,
} from '#mocks/live-header-composition';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const checkingTestsStatus = 'Checking the tests';

const retryingStatus = 'Retrying (2 of 5)';

it.each(liveHeaderMocks)(
  'reads stored command and thought activity through list and Feed for $agent',
  async ({ agent, command, thought }): Promise<void> => {
    const context = await startLiveHeaderHost(agent);
    expect(await readLiveHeader(context, 'Working')).toBe('Working');
    await publishStoredHeader(context, {
      ...command,
      revision: 2,
      title: '',
      kind: 'execute',
      content: [{ type: 'terminal', command: 'pnpm test', output: '' }],
      _meta: undefined,
    });
    expect(await readLiveHeader(context, 'Running pnpm test')).toBe(
      'Running pnpm test',
    );
    await publishStoredHeader(context, { ...thought, revision: 3 });
    expect(await readLiveHeader(context, checkingTestsStatus)).toBe(
      checkingTestsStatus,
    );
    await publishStoredHeader(context, {
      ...command,
      revision: 4,
      status: 'completed',
      state: 'settled',
    });
    expect(await readLiveHeader(context, checkingTestsStatus)).toBe(
      checkingTestsStatus,
    );
  },
);

it.each(liveHeaderMocks)(
  'retains stored retry activity when Feed reconnects for $agent',
  async ({ agent, retry }): Promise<void> => {
    const context = await startLiveHeaderHost(agent);
    await publishStoredHeader(context, { ...retry, revision: 2 });
    expect(await readLiveHeader(context, retryingStatus)).toBe(retryingStatus);

    const reconnect = (
      await context.caller.feed.subscribe({
        sessionId: 'session-1',
        after: null,
      })
    )[Symbol.asyncIterator]();

    expect((await reconnect.next()).value).toMatchObject({
      type: 'snapshot',
      snapshot: {
        liveHeader: {
          text: retryingStatus,
          source: { type: 'retry' },
          startedAt: expect.any(Number),
        },
      },
    });
  },
);

it.each(
  liveHeaderMocks.flatMap((mock) =>
    mock.progress.map((progress) => ({ ...mock, progress })),
  ),
)(
  'clears stored retry after $progress.sessionUpdate for $agent',
  async ({ agent, thought, retry, progress }): Promise<void> => {
    const context = await startLiveHeaderHost(agent);
    await publishStoredHeader(context, { ...thought, revision: 2 });
    await publishStoredHeader(context, { ...retry, revision: 3 });
    expect(await readLiveHeader(context, retryingStatus)).toBe(retryingStatus);
    await publishStoredHeader(context, { ...progress, revision: 4 });
    expect(await readLiveHeader(context, checkingTestsStatus)).toBe(
      checkingTestsStatus,
    );
  },
);

it.each(liveHeaderMocks)(
  'prioritizes a Permission request over stored activity for $agent',
  async ({ agent, command, thought }): Promise<void> => {
    const context = await startLiveHeaderHost(agent);
    await publishStoredHeader(context, { ...thought, revision: 2 });
    await requireScriptedProcessAt(context.input.agent.processes).play(
      [
        {
          type: 'permission',
          detached: true,
          request: {
            toolCall: { toolCallId: command.toolCallId, title: 'Allow tests?' },
            options: permissionOptions,
          },
        },
      ],
      'owned-1',
    );
    await expect
      .poll(
        async () =>
          (await context.caller.session.list({ archived: false })).sessions[0]
            ?.activity,
      )
      .toBe('Allow tests?');
  },
);

it.each(liveHeaderMocks)(
  'starts a new Turn without the preceding stored activity for $agent',
  async ({ agent, thought }): Promise<void> => {
    const context = await startLiveHeaderHost(agent);
    await publishStoredHeader(context, { ...thought, revision: 2 });
    expect(await readLiveHeader(context, checkingTestsStatus)).toBe(
      checkingTestsStatus,
    );
    context.completed.resolve();
    await waitForAcpSessionIdle(context.host, 'session-1');
    await context.caller.session.prompt({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Next Turn' }],
    });
    expect(await readLiveHeader(context, 'Working')).toBe('Working');
  },
);
