import { execFileSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { zipSync } from 'fflate';
import { create } from 'tar';
import { installationExecutable } from './installation';

export const tarBinaryArchive = async (
  extension: string,
  link = false,
): Promise<Uint8Array> => {
  const directory = await mkdtemp(join(tmpdir(), 'argo-launch-archive-'));

  try {
    return await createArchive(directory, extension, link);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

const createArchive = async (
  directory: string,
  extension: string,
  link: boolean,
): Promise<Uint8Array> => {
  const source = join(directory, 'source');
  await mkdir(source);
  await writeFile(join(source, 'agent'), installationExecutable);

  if (link) await symlink(join(directory, 'outside'), join(source, 'link'));
  const archive = join(directory, 'download');
  const bzip = extension.endsWith('bz2');
  await create(
    { file: archive, cwd: source, gzip: !bzip },
    link ? ['agent', 'link'] : ['agent'],
  );
  const bytes = await readFile(archive);

  return bzip
    ? execFileSync('bzip2', ['--compress', '--stdout'], { input: bytes })
    : bytes;
};

export const binaryRejections = [
  {
    failure: 'invalid command',
    cmd: '../escape',
    suffix: '',
    bytes: async (): Promise<Uint8Array> => installationExecutable,
    message: 'Registry command must be',
  },
  {
    failure: 'unsupported archive',
    cmd: './agent',
    suffix: '.tar.xz',
    bytes: async (): Promise<Uint8Array> => installationExecutable,
    message: 'Unsupported Agent archive format',
  },
  {
    failure: 'missing file',
    cmd: './agent',
    suffix: '.zip',
    bytes: async (): Promise<Uint8Array> =>
      zipSync({ wrong: new Uint8Array() }),
    message: 'ENOENT',
  },
  {
    failure: 'raw tar archive',
    cmd: './agent',
    suffix: '.tar',
    bytes: async (): Promise<Uint8Array> => installationExecutable,
    message: 'Unsupported Agent archive format',
  },
  {
    failure: 'ZIP traversal with a safe launch file',
    cmd: './agent',
    suffix: '.zip',
    bytes: async (): Promise<Uint8Array> =>
      zipSync({
        agent: installationExecutable,
        '../outside': new Uint8Array([1]),
      }),
    message: 'escapes',
  },
  {
    failure: 'tar symlink',
    cmd: './agent',
    suffix: '.tgz',
    bytes: (): Promise<Uint8Array> => tarBinaryArchive('.tgz', true),
    message: 'links or special files',
  },
];
