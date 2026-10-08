import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { startLineProcess } from '../line-process.ts';
import { mockCliScenarioEnvironment } from '../mock-cli.ts';
import { findRecording, readRecording, recordedFrames } from '../recording.ts';
import { readRequestAnswers } from '../request-answer.ts';
import { recordedRequestAnswer } from './recorded-request-answer.ts';
import { writeMockCodex } from './write-mock-codex.ts';

let directory: string;
const producer = 'codex-app-server';
const turnStart = 'turn/start';

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
      await writeMockCodex(directory, { recording }),
      ['app-server'],
    );
    const payload = readRecording(
      findRecording(path.join(import.meta.dirname, 'recordings'), recording),
      producer,
    ).payload;
    for (const input of recordedFrames<Record<string, unknown>>(
      payload,
      'input',
    ))
      vendor.send(input);
    vendor.close();
    expect(await vendor.exited).toBe(0);
    expect(readRequestAnswers(answersFile)).toEqual([
      recordedRequestAnswer(recording),
    ]);
  },
);

it('reports and counts an unsupported live Permission answer', async (): Promise<void> => {
  const vendor = startLineProcess(
    await writeMockCodex(directory, { recording: 'permission' }),
    ['app-server'],
  );
  vendor.send({ id: 1, method: turnStart, params: { input: [] } });
  const output = await vendor.until(
    (frame): boolean =>
      frame.method === 'item/commandExecution/requestApproval',
  );
  const request = output.at(-1);
  if (!request) throw new Error('Recording has no Permission request');
  vendor.send({ id: request.id, result: { decision: 'unsupported' } });
  await expect(vendor.next()).rejects.toThrow(
    'Mock CLI rejected request answer (1)',
  );
  expect(await vendor.exited).toBe(1);
});

it.each([{}, { params: null }, { params: { input: 'text' } }])(
  'rejects malformed recorded Plan parameters %j',
  async (nextTurn): Promise<void> => {
    const name = await writeRecording({
      messages: [],
      input: [
        { method: turnStart, params: { input: [] } },
        { method: turnStart, ...nextTurn },
      ],
    });
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => recordedRequestAnswer(name, directory)).toThrow(
      'Unsupported codex request answer',
    );
    expect(diagnostic).toHaveBeenCalledExactlyOnceWith(
      'Mock CLI rejected request answer (1)',
    );
  },
);

it.each([
  { input: { id: 99, result: { answers: {} } }, action: 'decline' },
  { input: { method: 'turn/interrupt' }, action: 'cancel' },
])(
  'reads recorded Elicitation %s without Turn parameters',
  async ({ input, action }): Promise<void> => {
    const name = await writeRecording({
      messages: [{ id: 99, method: 'item/tool/requestUserInput' }],
      input: [input],
    });
    expect(recordedRequestAnswer(name, directory)).toEqual({
      type: 'elicitation',
      action,
    });
  },
);

async function writeRecording(payload: unknown): Promise<string> {
  const name = `answer-${randomUUID()}`;
  const source = findRecording(
    path.join(import.meta.dirname, 'recordings'),
    'plan-approved',
  );
  const { version } = readRecording(source, producer);
  const folder = path.join(directory, version);
  await mkdir(folder);
  await writeFile(
    path.join(folder, `${name}.json`),
    JSON.stringify({ producer, version, recordedAt: null, payload }),
  );
  return name;
}
