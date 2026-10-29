import { SessionFeedOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { operationCaller, runOperation } from '#mocks/operations';

const originalText = 'First';

it('reads a newer live Agent message while its stored update waits for the Writer', async () => {
  const append = Promise.withResolvers<void>();
  const firstEntered = Promise.withResolvers<void>();
  const finish = Promise.withResolvers<void>();
  const secondEntered = Promise.withResolvers<void>();

  const host = await startAcpEngine({
    steps: [
      {
        type: 'update',
        update: {
          sessionUpdate: 'agent_message_chunk',
          messageId: 'live-result',
          content: { type: 'text', text: originalText },
        },
      },
      { type: 'gate', waitFor: append.promise, entered: firstEntered },
      {
        type: 'update',
        update: {
          sessionUpdate: 'agent_message_chunk',
          messageId: 'live-result',
          content: { type: 'text', text: ' latest' },
        },
      },
      { type: 'gate', waitFor: finish.promise, entered: secondEntered },
    ],
  });

  try {
    const created = await host.caller.session.new({
      ...emptySessionInput,
      prompt: [{ type: 'text', text: 'Review while running' }],
    });

    await firstEntered.promise;
    await expect
      .poll(() => host.caller.feed.page({ ...created, direction: 'tail' }), {
        timeout: 5000,
      })
      .toMatchObject({
        rows: expect.arrayContaining([
          expect.objectContaining({
            sessionUpdate: 'agent_message',
            content: [{ type: 'text', text: originalText }],
          }),
        ]),
      });

    host.database.$client.exec(`
      CREATE TRIGGER hold_agent_message_write BEFORE UPDATE ON feed_row
      WHEN NEW.session_update = 'agent_message'
      BEGIN SELECT RAISE(ABORT, 'database is locked'); END
    `);
    append.resolve();
    await secondEntered.promise;

    expect(
      await host.caller.feed.page({ ...created, direction: 'tail' }),
    ).toMatchObject({
      rows: expect.arrayContaining([
        expect.objectContaining({
          content: [{ type: 'text', text: originalText }],
        }),
      ]),
    });
    const caller = await operationCaller(host);

    const page = SessionFeedOutput.parse(
      await runOperation(caller.operations, {
        id: 'session.feed',
        params: created,
      }),
    );

    expect(page.messages).toMatchObject([
      { content: [{ type: 'text', text: 'First latest' }] },
    ]);
    expect(page.nextCursor).toBeNull();
  } finally {
    host.database.$client.exec(
      'DROP TRIGGER IF EXISTS hold_agent_message_write',
    );
    append.resolve();
    finish.resolve();
  }
}, 30_000);
