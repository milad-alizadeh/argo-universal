import { randomUUID } from 'node:crypto';
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
import {
  createInstallationPorts,
  installationExecutable,
} from '@repo/mocks/registry/installation';
import { create } from 'tar';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { installEntry } from '#mocks/installation';
import {
  materializeAgent,
  type MaterializationInput,
} from './install/materialize';
import { selectedLaunchDefinition } from './install/selection';
let home: string;
beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), 'install-archives-'));
});
afterEach(async () => {
  await rm(home, { recursive: true, force: true });
});
const archiveBytes = async (extension: string): Promise<Buffer> => {
  const source = join(home, 'source');
  await mkdir(source);
  await writeFile(join(source, 'agent'), installationExecutable);
  const archive = join(home, 'download');
  await create(
    {
      file: archive,
      cwd: source,
      gzip: extension === 'tgz' || extension === 'tar.gz',
    },
    ['agent'],
  );
  return readFile(archive);
};
const archiveInput = (
  extension: string,
  bytes: Uint8Array,
): MaterializationInput => ({
  home,
  agentId: 'fixture-install',
  operationId: randomUUID(),
  entry: installEntry('binary'),
  recipe: {
    kind: 'binary',
    archive: `https://example.org/agent.${extension}`,
    cmd: 'agent',
    args: [],
    env: {},
  },
  signal: new AbortController().signal,
  ports: {
    ...createInstallationPorts(),
    download: async () => bytes,
    runTool: async (input) => {
      await writeFile(input.outputFile ?? join(input.cwd, '.archive'), bytes);
      return '';
    },
  },
});
it.each(['tar', 'tgz', 'tar.gz', 'tar.bz2', 'tbz2'])(
  'extracts the %s distribution into verified managed files',
  async (extension) => {
    const input = archiveInput(extension, await archiveBytes(extension));
    const selection = await materializeAgent(input);
    const launch = await selectedLaunchDefinition(
      home,
      input.agentId,
      selection,
    );
    expect(await readFile(launch.executable)).toEqual(installationExecutable);
  },
);
it('rejects tar symlinks before extraction can follow them outside staging', async () => {
  const source = join(home, 'source');
  await mkdir(source);
  await symlink(join(home, 'outside'), join(source, 'agent'));
  const archive = join(home, 'download');
  await create({ file: archive, cwd: source }, ['agent']);
  await expect(
    materializeAgent(archiveInput('tar', await readFile(archive))),
  ).rejects.toThrow('links or special files');
});
