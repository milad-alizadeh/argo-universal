import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { readRequestAnswers } from './request-answer.ts';

it('reads a recorded cancelled Permission request with a null option id', async (): Promise<void> => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'request-answers-'));
  const file = path.join(directory, 'answers.jsonl');
  try {
    await writeFile(file, '{"type":"permission","optionId":null}\n');
    expect(readRequestAnswers(file)).toEqual([
      { type: 'permission', optionId: null },
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
