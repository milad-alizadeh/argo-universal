import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

export type FixtureTls = { key: string; cert: string };

const run = promisify(execFile);

// The names the fixture certificate is valid for.
const subjectAltName =
  'subjectAltName=DNS:localhost,DNS:api.fixture.test,IP:127.0.0.1';

const algorithmArguments = [
  'req',
  '-x509',
  '-newkey',
  'ec',
  '-pkeyopt',
  'ec_paramgen_curve:prime256v1',
  '-nodes',
];

const openSslArguments = (folder: string): string[] => [
  ...algorithmArguments,
  '-keyout',
  join(folder, 'key.pem'),
  '-out',
  join(folder, 'cert.pem'),
  '-days',
  '1',
  '-subj',
  '/CN=localhost',
  '-addext',
  subjectAltName,
];

// A throwaway self-signed certificate, so no private key is ever committed or read from an ignored file.
async function generate(): Promise<FixtureTls> {
  const folder = await mkdtemp(join(tmpdir(), 'argo-fixture-tls-'));

  try {
    await run('openssl', openSslArguments(folder));

    return await readFixtureTls(folder);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

const readFixtureTls = async (folder: string): Promise<FixtureTls> => ({
  key: await readFile(join(folder, 'key.pem'), 'utf8'),
  cert: await readFile(join(folder, 'cert.pem'), 'utf8'),
});

let made: Promise<FixtureTls> | undefined;

// Made once per test process and shared by every fixture server and the Server's trust.
export const fixtureTls = (): Promise<FixtureTls> => (made ??= generate());
