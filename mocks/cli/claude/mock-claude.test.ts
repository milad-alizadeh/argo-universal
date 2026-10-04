import { execFile } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startLineProcess } from '../line-process.ts';
import { readRecording } from '../recording.ts';
import { writeMockClaude } from './write-mock-claude.ts';

const recorded = (name: string) =>
  readFileSync(
    path.join(import.meta.dirname, 'recordings/2.1.286', name),
    'utf8',
  )
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));

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

describe('claude recordings', () => {
  const folder = path.join(import.meta.dirname, 'recordings/2.1.286');

  it.each(readdirSync(folder))(
    '%s reads as a recording of its folder version',
    (name) => {
      expect(readRecording(path.join(folder, name), 'claude-cli').version).toBe(
        '2.1.286',
      );
    },
  );
});

describe('mock Claude CLI', () => {
  it('reports the version of its recordings', async () => {
    const executable = await writeMockClaude(directory, {
      recording: 'task-plan',
    });

    const { stdout } = await promisify(execFile)(executable, ['--version']);

    expect(stdout).toBe('2.1.286 (Claude Code)\n');
  });

  it('refuses a recording it does not have', async () => {
    await expect(
      writeMockClaude(directory, { recording: 'no-such-turn' }),
    ).rejects.toThrow(/no-such-turn/);
  });

  it('answers the SDK initialize request', async () => {
    const claude = startLineProcess(
      await writeMockClaude(directory, { recording: 'task-plan' }),
      SDK_FLAGS,
    );

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

  it('replays the recorded Turn between its own init and result frames', async () => {
    const frames = recorded('task-plan.jsonl');
    const sessionId = frames[0].session_id;
    const claude = startLineProcess(
      await writeMockClaude(directory, { recording: 'task-plan' }),
      SDK_FLAGS,
    );

    claude.send(prompt('Plan the work.'));
    const output = await claude.until((frame) => frame.type === 'result');

    expect(output[0]).toMatchObject({
      type: 'system',
      subtype: 'init',
      session_id: sessionId,
      claude_code_version: '2.1.286',
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
  });

  it('exits mid-Turn when asked to stand in for a crash', async () => {
    const frames = recorded('task-plan.jsonl');
    const claude = startLineProcess(
      await writeMockClaude(directory, {
        recording: 'task-plan',
        exitMidTurn: true,
      }),
      SDK_FLAGS,
    );

    claude.send(prompt('Plan the work.'));

    expect(await claude.exited).not.toBe(0);
    expect(claude.output.slice(1)).toEqual(frames.slice(0, 1));
    expect(claude.output.some((frame) => frame.type === 'result')).toBe(false);
  });
});
