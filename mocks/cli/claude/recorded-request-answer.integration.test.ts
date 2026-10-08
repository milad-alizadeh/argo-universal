import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { startLineProcess } from '../line-process.ts';
import { mockCliScenarioEnvironment } from '../mock-cli.ts';
import { isRecordedFrame as isWireFrame } from '../recording.ts';
import { findRecording, readRecording, recordedFrames } from '../recording.ts';
import { readRequestAnswers } from '../request-answer.ts';
import { recordedRequestAnswer } from './recorded-request-answer.ts';
import { writeMockClaude } from './write-mock-claude.ts';

let directory: string;

beforeEach(async (): Promise<void> => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'recorded-answers-'));
});
afterEach((): Promise<void> => rm(directory, { recursive: true, force: true }));

it.each(['permission', 'elicitation', 'plan-approved', 'plan-kept-planning'])(
  'records the live %s answer like its recorded reader',
  async (recording): Promise<void> => {
    const answersFile = path.join(directory, 'answers.jsonl');
    vi.stubEnv(
      'MOCK_CLI_SCENARIO',
      mockCliScenarioEnvironment({ requestAnswersFile: answersFile })
        .MOCK_CLI_SCENARIO,
    );
    const vendor = startLineProcess(
      await writeMockClaude(directory, { recording }),
      [],
    );
    const payload = readRecording(
      findRecording(path.join(import.meta.dirname, 'recordings'), recording),
      'claude-cli',
    ).payload;
    const inputs = recordedFrames(payload, 'input', isWireFrame);
    const firstAnswer = inputs.findIndex(
      (frame): boolean => frame.type === 'control_response',
    );
    for (const input of inputs.slice(0, firstAnswer + 1)) vendor.send(input);
    vendor.close();
    expect(await vendor.exited).toBe(0);
    expect(readRequestAnswers(answersFile)).toEqual([
      recordedRequestAnswer(recording),
    ]);
  },
);

it('reports and counts a malformed live Permission response', async (): Promise<void> => {
  const vendor = startLineProcess(
    await writeMockClaude(directory, { recording: 'permission' }),
    [],
  );
  const payload = readRecording(
    findRecording(path.join(import.meta.dirname, 'recordings'), 'permission'),
    'claude-cli',
  ).payload;
  const inputs = recordedFrames(payload, 'input', isWireFrame);
  const firstAnswer = inputs.findIndex(
    (frame): boolean => frame.type === 'control_response',
  );
  for (const input of inputs.slice(0, firstAnswer)) vendor.send(input);
  const output = await vendor.until(
    (frame): boolean => frame.type === 'control_request',
  );
  const request = output.at(-1);
  if (!request) throw new Error('Recording has no Permission request');
  vendor.send({
    type: 'control_response',
    response: {
      subtype: 'success',
      request_id: request.request_id,
      response: { behavior: 'unsupported' },
    },
  });
  await expect(vendor.next()).rejects.toThrow(
    'Mock CLI rejected request answer (1)',
  );
  expect(await vendor.exited).toBe(1);
});
