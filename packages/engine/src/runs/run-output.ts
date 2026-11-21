import { appendFile, mkdir, open, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

export const runOutputPath = (home: string, runId: string): string =>
  join(home, 'runs', `${runId}.log`);

export const createRunOutput = async (path: string): Promise<void> => {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, '');
};

export const appendRunOutput = (path: string, data: string): Promise<void> =>
  appendFile(path, data);

export const removeRunOutput = (path: string): Promise<void> =>
  rm(path, { force: true });

const bytesPerCharacter = 4;

// The end of the recorded terminal stream as plain text: colours and cursor movement are left out.
export const readRunOutputTail = async (
  path: string,
  characters: number,
): Promise<string> => {
  const file = await open(path, 'r').catch((): undefined => undefined);

  if (!file) return '';

  try {
    const { size } = await file.stat();
    const length = Math.min(size, characters * bytesPerCharacter);
    const buffer = Buffer.alloc(length);
    await file.read(buffer, 0, length, size - length);

    return stripVTControlCharacters(buffer.toString('utf8')).slice(-characters);
  } finally {
    await file.close();
  }
};
