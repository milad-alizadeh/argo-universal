import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readRecording, splitTurns } from './recording.ts';

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'mock-recording-'));
  await mkdir(path.join(directory, '1.2.3'));
});

afterEach(() => rm(directory, { recursive: true, force: true }));

const write = async (name: string, value: string) => {
  const file = path.join(directory, '1.2.3', name);
  await writeFile(file, value);
  return file;
};

const tagged = (fields: Record<string, unknown>) =>
  JSON.stringify({
    producer: 'agent-cli',
    version: '1.2.3',
    recordedAt: '2026-10-01',
    payload: [{ type: 'frame' }],
    ...fields,
  });

describe('readRecording', () => {
  it('reads a tagged recording with the version of its folder', async () => {
    const file = await write('turn.json', tagged({}));

    expect(readRecording(file, 'agent-cli')).toEqual({
      version: '1.2.3',
      recordedAt: '2026-10-01',
      payload: [{ type: 'frame' }],
    });
  });

  it('reads a JSONL recording as one frame per line', async () => {
    const file = await write('turn.jsonl', '{"type":"a"}\n{"type":"b"}\n');

    expect(readRecording(file, 'agent-cli')).toEqual({
      version: '1.2.3',
      recordedAt: null,
      payload: [{ type: 'a' }, { type: 'b' }],
    });
  });

  it('rejects a version that disagrees with the folder', async () => {
    const file = await write('turn.json', tagged({ version: '9.9.9' }));

    expect(() => readRecording(file, 'agent-cli')).toThrow(
      /turn\.json.*version/,
    );
  });

  it('rejects a producer the caller did not ask for', async () => {
    const file = await write('turn.json', tagged({ producer: 'other-cli' }));

    expect(() => readRecording(file, 'agent-cli')).toThrow(
      /turn\.json.*producer/,
    );
  });

  it('requires the capture date field, even when it is unknown', async () => {
    const file = await write('turn.json', tagged({ recordedAt: undefined }));

    expect(() => readRecording(file, 'agent-cli')).toThrow(
      /turn\.json.*recordedAt/,
    );
  });
});

describe('splitTurns', () => {
  it('ends a Turn at each end frame and keeps a trailing Turn', () => {
    const ends = (frame: string) => frame === 'end';

    expect(splitTurns(['a', 'end', 'b', 'c', 'end', 'd'], ends)).toEqual([
      ['a', 'end'],
      ['b', 'c', 'end'],
      ['d'],
    ]);
  });
});
