import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { unzipSync } from 'fflate';
import { extract, list } from 'tar';
import type { InstallPorts } from '../ports';
import { installationPath } from './files';
import { ArchiveBudget, executableMode, extractedLimit } from './limits';
import type { InstallRecipe } from './recipe';

type BinaryRecipe = Extract<InstallRecipe, { kind: 'binary' }>;

export type BinaryInput = {
  directory: string;
  recipe: BinaryRecipe;
  bytes: Uint8Array;
  signal: AbortSignal;
  ports: InstallPorts;
};

const verifyChecksum = (recipe: BinaryRecipe, bytes: Uint8Array): void => {
  if (!recipe.sha256) return;

  if (
    createHash('sha256').update(bytes).digest('hex') !==
    recipe.sha256.toLowerCase()
  )
    throw new Error('The downloaded files failed their integrity check');
};

const writeEntry = async (
  directory: string,
  name: string,
  bytes: Uint8Array,
): Promise<void> => {
  const file = installationPath(directory, name);

  if (name.endsWith('/')) return;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, bytes, { mode: executableMode, flag: 'wx' });
};

const extractZip = async (
  directory: string,
  bytes: Uint8Array,
): Promise<void> => {
  const budget = new ArchiveBudget(directory);

  const entries = unzipSync(bytes, {
    filter: (file): boolean => {
      budget.accept(file.name, file.originalSize);

      return true;
    },
  });

  for (const [name, content] of Object.entries(entries))
    await writeEntry(directory, name, content);
};

const inspectTar = async (
  directory: string,
  archive: string,
): Promise<void> => {
  const budget = new ArchiveBudget(directory);
  await list({
    file: archive,
    strict: true,
    onReadEntry: (entry) => budget.acceptTar(entry),
  });
  budget.verify();
};

const extractTar = async (
  directory: string,
  archive: string,
): Promise<void> => {
  await inspectTar(directory, archive);
  await extract({
    file: archive,
    cwd: directory,
    strict: true,
    preservePaths: false,
  });
};

const extractBzip = async (input: BinaryInput): Promise<void> => {
  const archive = join(input.directory, '.archive.bz2');
  await writeFile(archive, input.bytes);
  await input.ports.runTool({
    executable: 'bzip2',
    args: ['--decompress', '--stdout', '--', archive],
    outputFile: join(input.directory, '.decompressed'),
    outputLimit: extractedLimit,
    cwd: input.directory,
    signal: input.signal,
  });
  await extractTar(input.directory, join(input.directory, '.decompressed'));
};

const extractRaw = async (
  input: BinaryInput,
  extension: string,
): Promise<void> => {
  if (/\.(dmg|pkg|deb|rpm|msi|appimage)$/.test(extension))
    throw new Error('Unsupported Agent installer format');
  await writeEntry(input.directory, input.recipe.cmd, input.bytes);
};

const extractCompressed = async (
  input: BinaryInput,
  extension: string,
): Promise<void> => {
  if (/\.(tar.bz2|tbz2)$/.test(extension)) return extractBzip(input);

  if (/\.(tar|tar.gz|tgz)$/.test(extension))
    return extractTar(input.directory, join(input.directory, '.archive'));

  return extractFile(input, extension);
};

const extractBinary = async (input: BinaryInput): Promise<void> => {
  const extension = new URL(input.recipe.archive).pathname.toLowerCase();

  if (extension.endsWith('.zip'))
    return extractZip(input.directory, input.bytes);

  return extractCompressed(input, extension);
};

export const extractBinaryFiles = async (
  input: BinaryInput,
): Promise<string> => {
  verifyChecksum(input.recipe, input.bytes);
  await writeFile(join(input.directory, '.archive'), input.bytes);
  await extractBinary(input);
  input.signal.throwIfAborted();

  return input.recipe.cmd;
};

const extractFile = (input: BinaryInput, extension: string): Promise<void> =>
  extension.endsWith('.gz')
    ? writeEntry(
        input.directory,
        input.recipe.cmd,
        gunzipSync(input.bytes, { maxOutputLength: extractedLimit }),
      )
    : extractRaw(input, extension);
