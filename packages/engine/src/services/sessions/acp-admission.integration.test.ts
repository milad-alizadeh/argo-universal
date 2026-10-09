import type { PromptRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { waitFor } from 'xstate';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { findDatabaseWriter } from '../feed';

const commitFailureMessage = 'could not be saved';
const rejectFeedInsertion =
  "CREATE TRIGGER reject_feed BEFORE INSERT ON feed_row BEGIN SELECT RAISE(FAIL, 'prompt storage unavailable'); END";
const waitForWriterRetrySuccess = async (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
): Promise<void> => {
  host.context.database.$client.exec('DROP TRIGGER reject_feed');
  const writer = findDatabaseWriter(host.engine.system);
  if (!writer) throw new Error('Writer is missing');
  await waitFor(writer, (snapshot) => snapshot.matches('idle'));
};

it('initial prompted creation rejects a failed prompt commit and later retry never dispatches', async () => {
  const requests: PromptRequest[] = [];
  const host = await startAcpEngine({
    prompt: ({ params }) => {
      requests.push(params);
      return { stopReason: 'end_turn' };
    },
  });
  host.context.database.$client.exec(rejectFeedInsertion);
  await expect(
    host.caller.session.new({
      ...emptySessionInput,
      prompt: [{ type: 'text', text: 'Never start' }],
    }),
  ).rejects.toThrow(commitFailureMessage);
  await waitForWriterRetrySuccess(host);
  expect(requests).toEqual([]);
  expect(
    host.context.database.$client
      .prepare('SELECT status, stop_reason FROM turn')
      .get(),
  ).toEqual({ status: 'ended', stop_reason: 'error' });
});

it('a Turn insert failure rejects the later prompt receipt without ACP work', async () => {
  const requests: PromptRequest[] = [];
  const host = await startAcpEngine({
    prompt: ({ params }) => {
      requests.push(params);
      return { stopReason: 'end_turn' };
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  host.context.database.$client.exec(
    "CREATE TRIGGER reject_turn BEFORE INSERT ON turn BEGIN SELECT RAISE(FAIL, 'Turn unavailable'); END",
  );
  await expect(
    host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Never start' }],
    }),
  ).rejects.toThrow(commitFailureMessage);
  host.context.database.$client.exec('DROP TRIGGER reject_turn');
  const writer = findDatabaseWriter(host.engine.system);
  if (!writer) throw new Error('Writer is missing');
  await waitFor(writer, (snapshot) => snapshot.matches('idle'));
  expect(requests).toEqual([]);
});

it('a second submission cannot overtake an admitted running Turn', async () => {
  const completion = Promise.withResolvers<{ stopReason: 'end_turn' }>();
  const requests: PromptRequest[] = [];
  const host = await startAcpEngine({
    prompt: ({ params }) => {
      requests.push(params);
      return completion.promise;
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'First' }],
  });
  await expect(
    host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Second' }],
    }),
  ).rejects.toThrow('cannot accept');
  completion.resolve({ stopReason: 'end_turn' });
  expect(requests).toHaveLength(1);
});

it('unsupported image prompts reject before success or Agent work', async () => {
  const requests: PromptRequest[] = [];
  const host = await startAcpEngine({
    prompt: ({ params }) => {
      requests.push(params);
      return { stopReason: 'end_turn' };
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  await expect(
    host.caller.session.prompt({
      ...created,
      prompt: [
        {
          type: 'image',
          mimeType: 'image/png',
          blob: { blobId: 'missing', mime: 'image/png', bytes: 1 },
        },
      ],
    }),
  ).rejects.toThrow('does not support image');
  expect(requests).toEqual([]);
  expect(
    host.context.database.$client
      .prepare('SELECT COUNT(*) AS count FROM feed_row')
      .get(),
  ).toEqual({ count: 0 });
});

it('a new explicit submission succeeds after a rejected commit and does not inherit its closure failure', async () => {
  const requests: PromptRequest[] = [];
  const host = await startAcpEngine({
    prompt: ({ params }) => {
      requests.push(params);
      return { stopReason: 'end_turn' };
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  host.context.database.$client.exec(rejectFeedInsertion);
  await expect(
    host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Failed' }],
    }),
  ).rejects.toThrow(commitFailureMessage);
  await waitForWriterRetrySuccess(host);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Explicit retry' }],
  });
  await expect(host.caller.session.close(created)).resolves.toEqual({});
  expect(requests.map((request) => request.prompt)).toEqual([
    [{ type: 'text', text: 'Explicit retry' }],
  ]);
});
