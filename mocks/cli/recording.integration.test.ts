import { globSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  type Recording,
  findRecording,
  readRecording,
  recordingVersion,
  splitTurns,
} from './recording.ts';

let directory: string;

beforeEach(async (): Promise<void> => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'mock-recording-'));
  await mkdir(path.join(directory, '1.2.3'));
});

afterEach((): Promise<void> => rm(directory, { recursive: true, force: true }));

const write = async (name: string, value: string): Promise<string> => {
  const file = path.join(directory, '1.2.3', name);
  await writeFile(file, value);
  return file;
};

const tagged = (fields: Record<string, unknown>): string =>
  JSON.stringify({
    producer: 'agent-cli',
    version: '1.2.3',
    recordedAt: '2026-10-01',
    payload: [{ type: 'frame' }],
    ...fields,
  });

describe('readRecording', (): void => {
  it('reads a tagged recording with the version of its folder', async (): Promise<void> => {
    const file = await write('turn.json', tagged({}));

    expect(readRecording(file, 'agent-cli')).toEqual({
      version: '1.2.3',
      payload: [{ type: 'frame' }],
    });
  });

  it('reads a JSONL recording as one frame per line', async (): Promise<void> => {
    const file = await write('turn.jsonl', '{"type":"a"}\n{"type":"b"}\n');

    expect(readRecording(file, 'agent-cli')).toEqual({
      version: '1.2.3',
      payload: [{ type: 'a' }, { type: 'b' }],
    });
  });

  it('rejects a version that disagrees with the folder', async (): Promise<void> => {
    const file = await write('turn.json', tagged({ version: '9.9.9' }));

    expect((): Recording => readRecording(file, 'agent-cli')).toThrow(
      /turn\.json.*version/,
    );
  });

  it('rejects a producer the caller did not ask for', async (): Promise<void> => {
    const file = await write('turn.json', tagged({ producer: 'other-cli' }));

    expect((): Recording => readRecording(file, 'agent-cli')).toThrow(
      /turn\.json.*producer/,
    );
  });

  it('requires the capture date field, even when it is unknown', async (): Promise<void> => {
    const file = await write('turn.json', tagged({ recordedAt: undefined }));

    expect((): Recording => readRecording(file, 'agent-cli')).toThrow(
      /turn\.json.*recordedAt/,
    );
  });
});

describe('findRecording', (): void => {
  it('finds a recording by name in the version folder, past stray files', async (): Promise<void> => {
    await writeFile(path.join(directory, '.DS_Store'), '');
    const file = await write('turn.jsonl', '{"type":"a"}\n');
    await write('notes.txt', '');

    expect(findRecording(directory, 'turn')).toBe(file);
    expect(recordingVersion(directory)).toBe('1.2.3');
  });

  it('refuses a name with no recording', (): void => {
    expect((): string => findRecording(directory, 'missing')).toThrow(
      /missing/,
    );
  });

  it('refuses a second version folder', async (): Promise<void> => {
    await mkdir(path.join(directory, '1.10.0'));

    expect((): string => recordingVersion(directory)).toThrow(
      /one version folder/,
    );
  });
});

describe('splitTurns', (): void => {
  it('ends a Turn at each end frame and keeps a trailing Turn', (): void => {
    const ends = (frame: string): boolean => frame === 'end';

    expect(splitTurns(['a', 'end', 'b', 'c', 'end', 'd'], ends)).toEqual([
      ['a', 'end'],
      ['b', 'c', 'end'],
      ['d'],
    ]);
  });
});

it('reads versioned recording paths only through recording modules', (): void => {
  const repository = path.resolve(import.meta.dirname, '../..');
  const files = globSync(
    [
      'mocks/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}',
      'packages/agents/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}',
    ],
    { cwd: repository, exclude: ['**/node_modules/**'] },
  );
  const pinned = files.filter((file): boolean => {
    if (file === 'mocks/cli/recording.ts') return false;
    return /recordings[/\\]\d+\.\d+\.\d+[/\\]/.test(
      readFileSync(path.join(repository, file), 'utf8'),
    );
  });
  expect(pinned).toEqual([]);
});
