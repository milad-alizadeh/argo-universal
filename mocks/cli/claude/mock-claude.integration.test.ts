import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type WireFrame,
  isWireFrame,
  isControlRequest,
  isControlResponse as isSDKControlResponse,
} from '../../../packages/agents/claude/control-payloads.ts';
import type {
  SDKControlRequest,
  SDKControlResponse,
} from '../../../packages/agents/claude/messages.ts';
import { startLineProcess } from '../line-process.ts';
import { mockCliScenarioEnvironment } from '../mock-cli.ts';
import {
  recordedFrames as captureFrames,
  findRecording,
  readRecording,
  recordingFiles,
  recordingVersion,
} from '../recording.ts';
import { writeMockClaude } from './write-mock-claude.ts';

const PRODUCER = 'claude-cli';
const RECORDINGS = path.join(import.meta.dirname, 'recordings');
const VERSION = recordingVersion(RECORDINGS);

const recordedFrames = (name: string): WireFrame[] =>
  captureFrames(
    readRecording(findRecording(RECORDINGS, name), PRODUCER).payload,
    'output',
    isWireFrame,
  );
const recordedPipes = (
  name: string,
): { input: WireFrame[]; output: WireFrame[] } => {
  const payload = readRecording(
    findRecording(RECORDINGS, name),
    PRODUCER,
  ).payload;
  return {
    input: captureFrames(payload, 'input', isWireFrame),
    output: captureFrames(payload, 'output', isWireFrame),
  };
};

const isControlResponse = (frame: { type: string }): boolean =>
  frame.type === 'control_response';

const prompt = (
  text: string,
): {
  type: string;
  message: { role: string; content: string };
  parent_tool_use_id: null;
  session_id: string;
} => ({
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

beforeEach(async (): Promise<void> => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'mock-claude-'));
});

afterEach(async (): Promise<void> => {
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

const startClaude = async (
  recording: string,
  exitMidTurn = false,
  flags: string[] = [],
): Promise<ReturnType<typeof startLineProcess>> =>
  startLineProcess(
    await writeMockClaude(directory, { recording, exitMidTurn }),
    [...SDK_FLAGS, ...flags],
  );

describe('claude recordings', (): void => {
  it('matches the SDK Claude Code major.minor version', (): void => {
    const sdk = createRequire(
      new URL('../../../packages/agents/package.json', import.meta.url),
    ).resolve('@anthropic-ai/claude-agent-sdk');
    const metadata: unknown = JSON.parse(
      readFileSync(path.join(path.dirname(sdk), 'package.json'), 'utf8'),
    );
    if (
      typeof metadata !== 'object' ||
      metadata === null ||
      !('claudeCodeVersion' in metadata)
    )
      throw new Error('SDK has no Claude Code version');
    if (typeof metadata.claudeCodeVersion !== 'string')
      throw new Error('SDK Claude Code version is not a string');
    expect(VERSION.split('.').slice(0, 2)).toEqual(
      metadata.claudeCodeVersion.split('.').slice(0, 2),
    );
  });
  it.each(recordingFiles(RECORDINGS))(
    '%s reads as a recording',
    (file): void => {
      expect(readRecording(file, PRODUCER).version).toBe(VERSION);
    },
  );
});

describe('mock Claude CLI', (): void => {
  it('reports the version of its recordings', async (): Promise<void> => {
    const executable = await writeMockClaude(directory, {
      recording: 'task-plan',
    });

    const { stdout } = await promisify(execFile)(executable, ['--version']);

    expect(stdout).toBe(`${VERSION} (Claude Code)\n`);
  });

  it('refuses a recording it does not have', async (): Promise<void> => {
    await expect(
      writeMockClaude(directory, { recording: 'no-such-turn' }),
    ).rejects.toThrow(/no-such-turn/);
  });

  it('answers the SDK initialize request', async (): Promise<void> => {
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

  it('acknowledges a model choice for the SDK before another prompt', async (): Promise<void> => {
    const cli = await startClaude('interrupt');
    const request = {
      type: 'control_request',
      request_id: 'set-model-1',
      request: { subtype: 'set_model', model: 'opus' },
    } satisfies SDKControlRequest;
    cli.send(request);
    expect(await cli.next()).toEqual({
      type: 'control_response',
      response: { subtype: 'success', request_id: 'set-model-1', response: {} },
    } satisfies SDKControlResponse);
    cli.close();
    expect(await cli.exited).toBe(0);
  });

  it('answers an interrupt when the recording has no interrupt answer', async (): Promise<void> => {
    const claude = await startClaude('task-plan');

    claude.send({
      type: 'control_request',
      request_id: 'interrupt-1',
      request: { subtype: 'interrupt' },
    });

    expect(await claude.next()).toMatchObject({
      type: 'control_response',
      response: { subtype: 'success', request_id: 'interrupt-1', response: {} },
    });
    claude.close();
    expect(await claude.exited).toBe(0);
  });

  it.each(['task-plan', 'text-stream', 'lifecycle'])(
    'replays %s between its own init and result frames',
    async (recording): Promise<void> => {
      const frames = recordedFrames(recording);
      const sessionId = frames[0]?.session_id;
      const claude = await startClaude(recording);

      claude.send(prompt('Go.'));
      const output = await claude.until(
        (frame): boolean => frame.type === 'result',
      );

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

  it('ends a prompt past the last Turn as a failed Turn, not a crash', async (): Promise<void> => {
    const claude = await startClaude('task-plan');

    claude.send(prompt('Go.'));
    await claude.until((frame): boolean => frame.type === 'result');
    claude.send(prompt('Again.'));

    expect(await claude.next()).toMatchObject({
      type: 'result',
      is_error: true,
      errors: ['The recording has no Turn 2.'],
    });
    claude.close();
    expect(await claude.exited).toBe(0);
  });

  it('exits mid-Turn when asked to stand in for a crash', async (): Promise<void> => {
    const frames = recordedFrames('task-plan');
    const claude = await startClaude('task-plan', true);

    claude.send(prompt('Go.'));

    expect(await claude.exited).toBe(1);
    expect(claude.output.slice(1)).toEqual(frames.slice(0, 1));
    expect(
      claude.output.some((frame): boolean => frame.type === 'result'),
    ).toBe(false);
  });

  it.each(['edit-and-command', 'image-prompt'])(
    'replays %s without its control responses, under the session id it was given',
    async (recording): Promise<void> => {
      const { output } = recordedPipes(recording);
      const claude = await startClaude(recording, false, [
        '--session-id',
        'session-from-flags',
      ]);

      claude.send(prompt('Go.'));
      const frames = await claude.until(
        (frame): boolean => frame.type === 'result',
      );

      const turn = output
        .filter((frame): boolean => !isControlResponse(frame))
        .slice(0, frames.length);
      expect(frames).toEqual(
        turn.map((frame): typeof frame =>
          'session_id' in frame
            ? { ...frame, session_id: 'session-from-flags' }
            : frame,
        ),
      );
      claude.close();
      expect(await claude.exited).toBe(0);
    },
  );

  it('answers initialize and get_context_usage with the recorded answers', async (): Promise<void> => {
    const { input, output } = recordedPipes('edit-and-command');
    const recordedAnswer = (subtype: string): WireFrame | undefined => {
      const request = input.find(
        (frame): boolean =>
          isControlRequest(frame) && frame.request.subtype === subtype,
      );
      return output.find(
        (frame): boolean =>
          isControlResponse(frame) &&
          JSON.stringify(frame).includes(
            `"request_id":"${isControlRequest(request) ? request.request_id : undefined}"`,
          ),
      );
    };
    const claude = await startClaude('edit-and-command');

    for (const subtype of ['initialize', 'get_context_usage']) {
      claude.send({
        type: 'control_request',
        request_id: `${subtype}-1`,
        request: { subtype },
      });
      const answer = recordedAnswer(subtype);
      if (
        !isSDKControlResponse(answer) ||
        answer.response.subtype !== 'success'
      )
        throw new Error(`No recorded answer for ${subtype}`);
      expect(await claude.next()).toEqual({
        type: 'control_response',
        response: {
          subtype: 'success',
          request_id: `${subtype}-1`,
          response: answer.response.response,
        },
      });
    }
    claude.close();
    expect(await claude.exited).toBe(0);
  });

  it('holds the rest of an interrupted Turn until the interrupt arrives', async (): Promise<void> => {
    const claude = await startClaude('interrupt');

    claude.send(prompt('Go.'));
    await claude.until(
      (frame): boolean =>
        frame.type === 'stream_event' &&
        JSON.stringify(frame).includes('"message_stop"'),
    );
    claude.send({
      type: 'control_request',
      request_id: 'interrupt-1',
      request: { subtype: 'interrupt' },
    });

    expect(await claude.next()).toMatchObject({
      type: 'control_response',
      response: { subtype: 'success', request_id: 'interrupt-1' },
    });
    expect(
      await claude.until((frame): boolean => frame.type === 'result'),
    ).toContainEqual(
      expect.objectContaining({
        type: 'result',
        terminal_reason: 'aborted_tools',
      }),
    );
    expect(
      claude.output.filter((frame): boolean => frame.type === 'result'),
    ).toHaveLength(1);
    claude.close();
    expect(await claude.exited).toBe(0);
  });

  it('sends no frame of a blocked Turn until the interrupt arrives', async (): Promise<void> => {
    for (const [key, value] of Object.entries(
      mockCliScenarioEnvironment({ blockTurnStart: true }),
    ))
      vi.stubEnv(key, value);
    const claude = await startClaude('interrupt');

    claude.send(prompt('Go.'));
    claude.send({
      type: 'control_request',
      request_id: 'interrupt-1',
      request: { subtype: 'interrupt' },
    });

    expect(await claude.next()).toMatchObject({
      type: 'control_response',
      response: { subtype: 'success', request_id: 'interrupt-1' },
    });
    expect(
      (await claude.until((frame): boolean => frame.type === 'result')).map(
        (frame): typeof frame.type => frame.type,
      ),
    ).toContain('result');
    claude.close();
    expect(await claude.exited).toBe(0);
  });
});

it('answers initialize with an account that has no subscription when not signed in', async (): Promise<void> => {
  const executable = await writeMockClaude(directory, {
    recording: 'edit-and-command',
    availability: 'not_signed_in',
  });
  const claude = startLineProcess(executable, SDK_FLAGS);
  claude.send({
    type: 'control_request',
    request_id: 'initialize-1',
    request: { subtype: 'initialize' },
  });
  expect(await claude.next()).toMatchObject({
    type: 'control_response',
    response: {
      subtype: 'success',
      request_id: 'initialize-1',
      response: expect.objectContaining({ account: {} }),
    },
  });
  claude.close();
  expect(await claude.exited).toBe(0);
});
