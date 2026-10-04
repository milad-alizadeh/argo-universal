import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { startLineProcess } from '../line-process.ts';
import {
  findRecording,
  readRecording,
  recordingFiles,
  recordingVersion,
} from '../recording.ts';
import { writeMockClaude } from './write-mock-claude.ts';

const PRODUCER = 'claude-cli';
const RECORDINGS = path.join(import.meta.dirname, 'recordings');
const VERSION = recordingVersion(RECORDINGS);

const RecordedFrames = z.array(
  z.looseObject({ type: z.string(), session_id: z.string().optional() }),
);

const recordedFrames = (name: string) =>
  RecordedFrames.parse(
    readRecording(findRecording(RECORDINGS, name), PRODUCER).payload,
  );

const prompt = (text: string) => ({
  type: 'user',
  message: { role: 'user', content: text },
  parent_tool_use_id: null,
  session_id: '',
});

// The flags the Agent SDK launches the CLI with.
const SDK_FLAGS = [
  '--output-format',
  'stream-json',
  '--input-format',
  'stream-json',
  '--verbose',
];

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'mock-claude-'));
});

afterEach(() => rm(directory, { recursive: true, force: true }));

const startClaude = async (recording: string, exitMidTurn = false) =>
  startLineProcess(
    await writeMockClaude(directory, { recording, exitMidTurn }),
    SDK_FLAGS,
  );

describe('claude recordings', () => {
  it.each(recordingFiles(RECORDINGS))('%s reads as a recording', (file) => {
    expect(readRecording(file, PRODUCER).version).toBe(VERSION);
  });
});

describe('mock Claude CLI', () => {
  it('reports the version of its recordings', async () => {
    const executable = await writeMockClaude(directory, {
      recording: 'task-plan',
    });

    const { stdout } = await promisify(execFile)(executable, ['--version']);

    expect(stdout).toBe(`${VERSION} (Claude Code)\n`);
  });

  it('refuses a recording it does not have', async () => {
    await expect(
      writeMockClaude(directory, { recording: 'no-such-turn' }),
    ).rejects.toThrow(/no-such-turn/);
  });

  it('answers the SDK initialize request', async () => {
    const claude = await startClaude('task-plan');

    claude.send({
      type: 'control_request',
      request_id: 'initialize-1',
      request: { subtype: 'initialize' },
    });

    expect(await claude.next()).toMatchObject({
      type: 'control_response',
      response: { subtype: 'success', request_id: 'initialize-1' },
    });
    claude.close();
    expect(await claude.exited).toBe(0);
  });

  it('rejects a control request the recording cannot answer', async () => {
    const claude = await startClaude('task-plan');

    claude.send({
      type: 'control_request',
      request_id: 'interrupt-1',
      request: { subtype: 'interrupt' },
    });

    expect(await claude.next()).toMatchObject({
      type: 'control_response',
      response: { subtype: 'error', request_id: 'interrupt-1' },
    });
    claude.close();
    expect(await claude.exited).toBe(0);
  });

  it.each(['task-plan', 'text-stream', 'lifecycle'])(
    'replays %s between its own init and result frames',
    async (recording) => {
      const frames = recordedFrames(recording);
      const sessionId = frames[0]?.session_id;
      const claude = await startClaude(recording);

      claude.send(prompt('Go.'));
      const output = await claude.until((frame) => frame.type === 'result');

      expect(output[0]).toMatchObject({
        type: 'system',
        subtype: 'init',
        session_id: sessionId,
        claude_code_version: VERSION,
      });
      expect(output.slice(1, -1)).toEqual(frames);
      expect(output.at(-1)).toMatchObject({
        type: 'result',
        subtype: 'success',
        is_error: false,
        session_id: sessionId,
      });
      claude.close();
      expect(await claude.exited).toBe(0);
    },
  );

  it('ends a prompt past the last Turn as a failed Turn, not a crash', async () => {
    const claude = await startClaude('task-plan');

    claude.send(prompt('Go.'));
    await claude.until((frame) => frame.type === 'result');
    claude.send(prompt('Again.'));

    expect(await claude.next()).toMatchObject({
      type: 'result',
      is_error: true,
      errors: ['The recording has no Turn 2.'],
    });
    claude.close();
    expect(await claude.exited).toBe(0);
  });

  it('exits mid-Turn when asked to stand in for a crash', async () => {
    const frames = recordedFrames('task-plan');
    const claude = await startClaude('task-plan', true);

    claude.send(prompt('Go.'));

    expect(await claude.exited).toBe(1);
    expect(claude.output.slice(1)).toEqual(frames.slice(0, 1));
    expect(claude.output.some((frame) => frame.type === 'result')).toBe(false);
  });
});
