import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { VendorMessage } from '../../../packages/agents/codex/messages.ts';
import {
  isVendorMessage,
  isThreadStartResponse,
} from '../../../packages/agents/codex/payloads.ts';
import { codexProtocolVersion } from '../../../packages/agents/codex/protocol.gen.ts';
import {
  type WireMessage,
  isWireMessage,
} from '../../../packages/agents/codex/wire-payloads.ts';
import { startLineProcess } from '../line-process.ts';
import type { MockCliOptions } from '../mock-cli.ts';
import {
  findRecording,
  readRecording,
  recordedFrames,
  recordingFiles,
  recordingVersion,
} from '../recording.ts';
import { writeMockCodex } from './write-mock-codex.ts';

const PRODUCER = 'codex-app-server';
const RECORDINGS = path.join(import.meta.dirname, 'recordings');
const VERSION = recordingVersion(RECORDINGS);

const recordedPayload = (
  name: string,
): ReturnType<typeof readRecording>['payload'] =>
  readRecording(findRecording(RECORDINGS, name), PRODUCER).payload;

// The wire messages of a recording, without the time each was captured.
const wireMessages = (name: string): WireMessage[] =>
  recordedFrames(recordedPayload(name), 'messages', isWireMessage).map(
    ({ emittedAtMs: _, ...message }): typeof message => message,
  );

let directory: string;

beforeEach(async (): Promise<void> => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'mock-codex-'));
});

afterEach((): Promise<void> => rm(directory, { recursive: true, force: true }));

const startAppServer = async (
  options: Partial<MockCliOptions> = {},
): Promise<ReturnType<typeof startLineProcess>> => {
  const codex = startLineProcess(
    await writeMockCodex(directory, { recording: 'file-change', ...options }),
    ['app-server'],
  );
  codex.send({ id: 1, method: 'initialize', params: {} });
  await codex.next();
  codex.send({ method: 'initialized' });
  return codex;
};

const startTurn = async (
  codex: Awaited<ReturnType<typeof startAppServer>>,
  threadId: string | undefined,
): Promise<void> => {
  codex.send({ id: 2, method: 'thread/start', params: {} });
  const started = await codex.next();
  expect(started).toMatchObject({
    id: 2,
    result: { thread: { id: threadId } },
  });
  expect(isThreadStartResponse(started.result)).toBe(true);
  codex.send({
    id: 3,
    method: 'turn/start',
    params: { threadId, input: [{ type: 'text', text: 'Go.' }] },
  });
};

describe('codex recordings', (): void => {
  it('matches the generated protocol version exactly', (): void => {
    expect(VERSION).toBe(codexProtocolVersion);
  });
  it.each(recordingFiles(RECORDINGS))(
    '%s reads as a recording',
    (file): void => {
      expect(readRecording(file, PRODUCER).version).toBe(VERSION);
    },
  );
});

describe('mock Codex CLI', (): void => {
  it('reports the version of its recordings', async (): Promise<void> => {
    const executable = await writeMockCodex(directory, {
      recording: 'file-change',
    });

    const { stdout } = await promisify(execFile)(executable, ['--version']);

    expect(stdout).toBe(`codex-cli ${VERSION}\n`);
  });

  it('refuses a recording it does not have', async (): Promise<void> => {
    await expect(
      writeMockCodex(directory, { recording: 'no-such-turn' }),
    ).rejects.toThrow(/no-such-turn/);
  });

  it('answers model/list with the recorded models', async (): Promise<void> => {
    const codex = await startAppServer();

    codex.send({ id: 2, method: 'model/list', params: {} });

    expect(await codex.next()).toEqual({
      id: 2,
      result: recordedPayload('model-list'),
    });
    codex.close();
    expect(await codex.exited).toBe(0);
  });

  it.each(['file-change', 'reply', 'edit-and-command', 'image-prompt'])(
    'replays %s after turn/start',
    async (recording): Promise<void> => {
      const messages = wireMessages(recording);
      const started = messages.find(
        (
          message,
        ): message is Extract<VendorMessage, { method: 'turn/started' }> =>
          message.method === 'turn/started',
      );
      const codex = await startAppServer({ recording });

      await startTurn(codex, started?.params.threadId);
      const output = await codex.until(
        (message): boolean => message.method === 'turn/completed',
      );

      expect(output[0]).toEqual({
        id: 3,
        result: {
          turn:
            started?.method === 'turn/started'
              ? started.params.turn
              : undefined,
        },
      });
      expect(output.slice(1)).toEqual(messages);
      codex.close();
      expect(await codex.exited).toBe(0);
    },
  );

  it('answers turn/start past the last Turn with an error, not a crash', async (): Promise<void> => {
    const messages = wireMessages('file-change');
    const codex = await startAppServer();

    await startTurn(codex, threadIdOf(messages[0]));
    await codex.until(
      (message): boolean => message.method === 'turn/completed',
    );
    codex.send({ id: 4, method: 'turn/start', params: { input: [] } });

    expect(await codex.next()).toEqual({
      id: 4,
      error: { code: -32603, message: 'The recording has no Turn 2.' },
    });
    codex.close();
    expect(await codex.exited).toBe(0);
  });

  it.each(['file-change', 'reply', 'edit-and-command', 'image-prompt'])(
    'exits right after turn/started in %s, to stand in for a crash',
    async (recording): Promise<void> => {
      const messages = wireMessages(recording);
      const codex = await startAppServer({ recording, exitMidTurn: true });

      await startTurn(codex, threadIdOf(messages[0]));

      expect(await codex.exited).toBe(1);
      const started = messages.findIndex(
        (
          message,
        ): message is Extract<VendorMessage, { method: 'turn/started' }> =>
          message.method === 'turn/started',
      );
      expect(codex.output.slice(3)).toEqual(messages.slice(0, started + 1));
    },
  );

  it.each(['thread/fork'])(
    'rejects %s, which the recording cannot answer',
    async (method): Promise<void> => {
      const codex = await startAppServer();

      codex.send({ id: 2, method, params: {} });

      expect(await codex.next()).toMatchObject({
        id: 2,
        error: { code: -32601 },
      });
      codex.close();
      expect(await codex.exited).toBe(0);
    },
  );
});

it('holds the recorded interrupted Turn until the caller interrupts its command', async (): Promise<void> => {
  const messages = wireMessages('interrupt');
  const codex = await startAppServer({ recording: 'interrupt' });
  await startTurn(codex, threadIdOf(messages[0]));
  const prefix = await codex.until((wireMessage): boolean => {
    if (!isVendorMessage(wireMessage)) return false;
    const message = wireMessage;
    return (
      message.method === 'item/started' &&
      message.params.item.type === 'commandExecution'
    );
  });
  expect(
    prefix.some((message): boolean => message.method === 'turn/completed'),
  ).toBe(false);
  codex.send({
    id: 4,
    method: 'turn/interrupt',
    params: {
      threadId: threadIdOf(messages[0]),
      turnId: messages.find(
        (
          message,
        ): message is Extract<VendorMessage, { method: 'turn/started' }> =>
          message.method === 'turn/started',
      )?.params.turn.id,
    },
  });
  const output = await codex.until(
    (message): boolean => message.method === 'turn/completed',
  );
  expect(output[0]).toEqual({ id: 4, result: {} });
  expect([...prefix.slice(1), ...output.slice(1)]).toEqual(messages);
  codex.close();
  expect(await codex.exited).toBe(0);
});

it('can replay turn/started before the response that supplies its vendor Turn id', async (): Promise<void> => {
  const codex = await startAppServer();
  codex.send({ id: 2, method: 'thread/start', params: {} });
  await codex.next();
  codex.send({
    id: 3,
    method: 'turn/start',
    params: { notificationsFirst: true },
  });
  const output = await codex.until(
    (message): boolean => message.method === 'turn/completed',
  );
  expect(output[0]).toMatchObject({ method: 'turn/started' });
  expect(output[1]).toMatchObject({
    id: 3,
    result: { turn: expect.objectContaining({ id: expect.any(String) }) },
  });
  codex.close();
  expect(await codex.exited).toBe(0);
});

it('reports an absent account when not signed in', async (): Promise<void> => {
  const codex = await startAppServer({ availability: 'not_signed_in' });
  codex.send({ id: 5, method: 'account/read', params: {} });
  expect(await codex.next()).toMatchObject({
    id: 5,
    result: { account: null, requiresOpenaiAuth: true },
  });
  codex.close();
  expect(await codex.exited).toBe(0);
});

const threadIdOf = (frame: WireMessage | undefined): string | undefined =>
  typeof frame?.params.threadId === 'string'
    ? frame.params.threadId
    : undefined;
