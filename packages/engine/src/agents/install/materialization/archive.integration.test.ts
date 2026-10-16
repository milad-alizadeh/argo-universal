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
import { installationExecutable } from '@repo/mocks/registry/installation';
import { zipSync } from 'fflate';
import { create } from 'tar';
import { beforeEach, expect, it, onTestFinished } from 'vitest';
import { installationPorts } from '#mocks/installation';
import { extractBinaryFiles, type BinaryInput } from './archive';

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'argo-registry-archive-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));
});

const archiveInput = (extension: string, bytes: Uint8Array): BinaryInput => ({
  directory: join(directory, 'staging'),
  recipe: { archive: `https://example.org/agent.${extension}`, cmd: 'agent' },
  bytes,
  signal: new AbortController().signal,
  ports: {
    ...installationPorts,
    runTool: async (input) => {
      await writeFile(input.outputFile ?? join(input.cwd, '.archive'), bytes);

      return '';
    },
  },
});

const extractArchive = async (input: BinaryInput): Promise<string> => {
  await mkdir(input.directory);

  return extractBinaryFiles(input);
};

it.each([
  '../outside',
  '/outside',
  'C:\\outside',
  'folder/../../outside',
  '.installer-group.json',
  './.installer-group.json.pending',
])(
  'rejects unsafe or reserved ZIP entry %s even with a safe launch file',
  async (name) => {
    const input = archiveInput(
      'zip',
      zipSync({ agent: installationExecutable, [name]: new Uint8Array([1]) }),
    );

    await expect(extractArchive(input)).rejects.toThrow(/escapes|reserved/);
  },
);

it.each(['../outside', '/outside', 'C:\\outside', 'folder/../../outside'])(
  'rejects unsafe raw launch path %s',
  async (cmd) => {
    const input = archiveInput('', installationExecutable);
    input.recipe.cmd = cmd;
    await expect(extractArchive(input)).rejects.toThrow('escapes');
  },
);

it.each(['tar', 'tgz', 'tar.gz', 'tar.bz2', 'tbz2'])(
  'extracts the %s distribution into real files',
  async (extension) => {
    const source = join(directory, 'source');
    await mkdir(source);
    await writeFile(join(source, 'agent'), installationExecutable);
    const archive = join(directory, 'download');
    await create(
      {
        file: archive,
        cwd: source,
        gzip: extension === 'tgz' || extension === 'tar.gz',
      },
      ['agent'],
    );
    const input = archiveInput(extension, await readFile(archive));
    await extractArchive(input);
    expect(await readFile(join(input.directory, 'agent'))).toEqual(
      installationExecutable,
    );
  },
);

it('rejects tar symlinks before extraction can follow them outside staging', async () => {
  const source = join(directory, 'source');
  await mkdir(source);
  await symlink(join(directory, 'outside'), join(source, 'agent'));
  const archive = join(directory, 'download');
  await create({ file: archive, cwd: source }, ['agent']);
  await expect(
    extractArchive(archiveInput('tar', await readFile(archive))),
  ).rejects.toThrow('links or special files');
});
