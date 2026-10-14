import {
  access,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { createMachinePath } from './machine-path';

const outsideFolder = async (): Promise<string> => {
  const folder = await mkdtemp(join(tmpdir(), 'argo-outside-'));
  onTestFinished(() => rm(folder, { recursive: true, force: true }));

  return folder;
};

// A file this test owns outside the machine, standing in for the real `node` a link may point at.
const outsideFile = async (): Promise<string> => {
  const file = join(await outsideFolder(), 'node');
  await writeFile(file, 'the real node');

  return file;
};

it('never writes through a PATH link that leads out of the machine, nor removes what it leads to', async () => {
  const machine = await createMachinePath();
  const outside = await outsideFile();
  await symlink(outside, join(machine.directory, 'node'));

  await expect(machine.place('node')).rejects.toThrow('outside');
  await expect(
    machine.placePackage('node', { name: 'fixture-install', version: '1.0.0' }),
  ).rejects.toThrow('outside');
  await expect(machine.remove('node')).rejects.toThrow('outside');
  expect(await readFile(outside, 'utf8')).toBe('the real node');
});

it('refuses a name that climbs out of the machine', async () => {
  const machine = await createMachinePath();

  await expect(machine.place('../../escaped')).rejects.toThrow('outside');
  await expect(
    machine.placeFormula('agent', { name: '../../../escaped', version: '1' }),
  ).rejects.toThrow('outside');
});

it('never creates a file through a dangling PATH link that leads out of the machine', async () => {
  const machine = await createMachinePath();
  const missing = join(await outsideFolder(), 'not-yet-there');
  await symlink(missing, join(machine.directory, 'agent'));

  await expect(machine.place('agent')).rejects.toThrow('outside');
  await expect(access(missing)).rejects.toThrow('ENOENT');
});

it('never makes folders through a linked folder that leads out of the machine', async () => {
  const machine = await createMachinePath();
  const outside = await outsideFolder();
  await symlink(outside, join(machine.directory, '..', 'Cellar'));

  await expect(
    machine.placeFormula('agent', { name: 'formula', version: '1' }),
  ).rejects.toThrow('outside');
  await expect(access(join(outside, 'formula'))).rejects.toThrow('ENOENT');
});
