import {
  access,
  appendFile,
  mkdir,
  open,
  rm,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { writeLog } from '@repo/machine-log';
import {
  blobsFolderIn,
  terminalOutputBlob,
  writeTerminalOutputBlob,
  type OutputBlobMetadata,
} from '../blob';
import type { RunRecord } from './run-store';

export const runOutputPath = (home: string, runId: string): string =>
  join(home, 'runs', `${runId}.log`);

export const runOutputFor = (
  home: string,
  { id, outputBlobId }: Pick<RunRecord, 'id' | 'outputBlobId'>,
): string =>
  outputBlobId === null
    ? runOutputPath(home, id)
    : join(blobsFolderIn(home), outputBlobId);

export function logRecordingFailure(
  home: string,
  action: string,
  error: Error,
): void {
  const line = `${action}: ${error.message}`;

  try {
    writeLog({ home, label: 'engine', line });
  } catch {
    console.error(line);
  }
}

export async function retainRunOutput(
  home: string,
  id: string,
): Promise<OutputBlobMetadata | undefined> {
  try {
    const output = await terminalOutputBlob(runOutputPath(home, id));
    await writeTerminalOutputBlob(blobsFolderIn(home), output);

    return output.metadata;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return undefined;

    logRecordingFailure(
      home,
      `Could not retain output for Run ${id}`,
      error instanceof Error ? error : new Error(String(error)),
    );

    return undefined;
  }
}

// A reader that already picked the scratch path can finish after the Blob is published.
export async function removeSealedRunScratch(
  home: string,
  record: Pick<RunRecord, 'id' | 'outputBlobId'>,
): Promise<void> {
  if (record.outputBlobId === null) return;
  const scratch = runOutputPath(home, record.id);

  try {
    await access(scratch);
    const output = await terminalOutputBlob(runOutputFor(home, record));

    if (output.metadata.id === record.outputBlobId)
      await removeRunOutput(scratch);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return;

    logRecordingFailure(
      home,
      `Could not verify recording for Run ${record.id}`,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

export const createRunOutput = async (path: string): Promise<void> => {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, '');
};

export const appendRunOutput = (path: string, data: string): Promise<void> =>
  appendFile(path, data);

export const removeRunOutput = (path: string): Promise<void> =>
  rm(path, { force: true });

const bytesPerCharacter = 4;

// The last bytes of a recording, as the terminal wrote them.
const readEnd = async (path: string, bytes: number): Promise<string> => {
  const file = await open(path, 'r').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return;
    throw error;
  });

  if (!file) return '';

  try {
    const { size } = await file.stat();
    const length = Math.min(size, bytes);
    const buffer = Buffer.alloc(length);
    await file.read(buffer, 0, length, size - length);

    return buffer.toString('utf8');
  } finally {
    await file.close();
  }
};

// The end of the recorded terminal stream as plain text: colours and cursor movement are left out.
export const readRunOutputTail = async (
  path: string,
  characters: number,
): Promise<string> =>
  stripVTControlCharacters(
    await readEnd(path, characters * bytesPerCharacter),
  ).slice(-characters);

// The end of the recorded terminal stream with its colours and cursor movement kept, for drawing it again.
export const readRunOutputRaw = readEnd;
