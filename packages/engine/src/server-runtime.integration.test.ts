import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readServerAddress,
  removeServerAddress,
  writeServerAddress,
} from './server-runtime';

let home: string;
const address = {
  pid: 4242,
  port: 7337,
  version: '1.2.3',
  startedAt: '2026-10-03T00:00:00.000Z',
};

beforeEach((): void => {
  home = mkdtempSync(join(tmpdir(), 'server-runtime-'));
});

afterEach((): void => {
  vi.restoreAllMocks();
  rmSync(home, { recursive: true, force: true });
});

describe('server address', (): void => {
  it('reads the address it wrote', (): void => {
    writeServerAddress(home, address);

    expect(readServerAddress(home)).toEqual(address);
    expect(readdirSync(home)).toEqual(['server.json']);
  });

  it('creates a missing home', (): void => {
    const nested = join(home, 'argo');

    writeServerAddress(nested, address);

    expect(readServerAddress(nested)).toEqual(address);
  });

  it('reads nothing without server.json', (): void => {
    expect(readServerAddress(home)).toBeNull();
  });

  it.each([
    ['is not JSON', '{'],
    ['has an unrecognised shape', JSON.stringify({ port: 7337 })],
  ])('rejects and reports a server.json that %s', (_, text): void => {
    const report = vi
      .spyOn(console, 'error')
      .mockImplementation((): void => {});
    writeFileSync(join(home, 'server.json'), text);

    expect(readServerAddress(home)).toBeNull();
    expect(report).toHaveBeenCalledOnce();
  });

  it('removes server.json that names the given pid', (): void => {
    writeServerAddress(home, address);

    removeServerAddress(home, address.pid);

    expect(readServerAddress(home)).toBeNull();
  });

  it('leaves server.json that names another pid', (): void => {
    writeServerAddress(home, address);

    removeServerAddress(home, address.pid + 1);

    expect(readServerAddress(home)).toEqual(address);
  });
});
