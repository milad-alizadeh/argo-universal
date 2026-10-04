import { execFile } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startLineProcess } from '../line-process.ts';
import { readRecording } from '../recording.ts';
import { writeMockCodex } from './write-mock-codex.ts';

type RecordedMessage = {
  method: string;
  params: { threadId: string; turn?: { id: string } };
};

const recorded = (name: string) =>
  JSON.parse(
    readFileSync(
      path.join(import.meta.dirname, 'recordings/0.157.0', name),
      'utf8',
    ),
  ).payload;

// The wire messages of a recording, without the time each was captured.
const wireMessages = (name: string): RecordedMessage[] =>
  recorded(name).messages.map(
    ({ emittedAtMs: _, ...message }: { emittedAtMs: number }) => message,
  );

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'mock-codex-'));
});

afterEach(() => rm(directory, { recursive: true, force: true }));

const startAppServer = async (options: { exitMidTurn?: boolean } = {}) => {
  const codex = startLineProcess(
    await writeMockCodex(directory, { recording: 'file-change', ...options }),
    ['app-server'],
  );
  codex.send({ id: 1, method: 'initialize', params: {} });
  await codex.next();
  codex.send({ method: 'initialized' });
  return codex;
};

describe('codex recordings', () => {
  const folder = path.join(import.meta.dirname, 'recordings/0.157.0');

  it.each(readdirSync(folder))(
    '%s reads as a recording of its folder version',
    (name) => {
      expect(
        readRecording(path.join(folder, name), 'codex-app-server').version,
      ).toBe('0.157.0');
    },
  );
});

describe('mock Codex CLI', () => {
  it('reports the version of its recordings', async () => {
    const executable = await writeMockCodex(directory, {
      recording: 'file-change',
    });

    const { stdout } = await promisify(execFile)(executable, ['--version']);

    expect(stdout).toBe('codex-cli 0.157.0\n');
  });

  it('refuses a recording it does not have', async () => {
    await expect(
      writeMockCodex(directory, { recording: 'no-such-turn' }),
    ).rejects.toThrow(/no-such-turn/);
  });

  it('answers model/list with the recorded models', async () => {
    const codex = await startAppServer();

    codex.send({ id: 2, method: 'model/list', params: {} });

    expect(await codex.next()).toEqual({
      id: 2,
      result: recorded('model-list.json'),
    });
    codex.close();
    expect(await codex.exited).toBe(0);
  });

  it('replays the recorded Turn after turn/start', async () => {
    const messages = wireMessages('file-change.json');
    const threadId = messages[0]?.params.threadId;
    const codex = await startAppServer();

    codex.send({ id: 2, method: 'thread/start', params: { cwd: directory } });
    expect(await codex.next()).toEqual({
      id: 2,
      result: { thread: { id: threadId } },
    });
    codex.send({
      id: 3,
      method: 'turn/start',
      params: { threadId, input: [{ type: 'text', text: 'Edit the files.' }] },
    });
    const output = await codex.until(
      (message) => message.method === 'turn/completed',
    );

    expect(output[0]).toMatchObject({
      id: 3,
      result: { turn: { id: messages[0]?.params.turn?.id } },
    });
    expect(output.slice(1)).toEqual(messages);
    codex.close();
    expect(await codex.exited).toBe(0);
  });

  it('exits mid-Turn when asked to stand in for a crash', async () => {
    const messages = wireMessages('file-change.json');
    const codex = await startAppServer({ exitMidTurn: true });
    const threadId = messages[0]?.params.threadId;

    codex.send({ id: 2, method: 'thread/start', params: {} });
    await codex.next();
    codex.send({
      id: 3,
      method: 'turn/start',
      params: { threadId, input: [] },
    });

    expect(await codex.exited).not.toBe(0);
    expect(codex.output.slice(-1)).toEqual(messages.slice(0, 1));
    expect(
      codex.output.some((message) => message.method === 'turn/completed'),
    ).toBe(false);
  });

  it('rejects a method it has no answer for', async () => {
    const codex = await startAppServer();

    codex.send({ id: 2, method: 'thread/fork', params: {} });

    expect(await codex.next()).toMatchObject({
      id: 2,
      error: { code: -32601 },
    });
    codex.close();
  });
});
