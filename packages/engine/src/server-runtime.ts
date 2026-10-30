import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ServerAddress } from '@repo/contracts';
import { jsonCodec } from './lib/json-codec';

const serverAddressFile = 'server.json';

const controlTokenFile = 'control.token';

const StoredServerAddress = jsonCodec(ServerAddress);

let unrecognisedAddresses = 0;

// The last damaged text reported, so a poller reports one damaged file once.
let lastUnrecognisedText: string | null = null;

// The Server and desktop share the ARGO_HOME boundary, including an empty override.
export const resolveRuntimeDirectory = (): string =>
  process.env.ARGO_HOME ?? join(homedir(), '.argo');

// The user token's file, which the Server makes on its first start (ADR-0044).
export const controlTokenPath = (home: string): string =>
  join(home, controlTokenFile);

// The Engine, the CLI and tests read the user token here.
export const readControlToken = async (home: string): Promise<string> =>
  (await readFile(controlTokenPath(home), 'utf8')).trim();

// Writes a temp file and renames it, so a reader never sees half a file.
export function writeServerAddress(home: string, address: ServerAddress): void {
  const filePath = join(home, serverAddressFile);
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  mkdirSync(home, { recursive: true });
  writeFileSync(
    temporaryPath,
    `${JSON.stringify(ServerAddress.parse(address), null, 2)}\n`,
  );
  renameSync(temporaryPath, filePath);
}

// The address in server.json; a missing file is null, and a damaged or foreign one is rejected, then reported and counted once per content.
export function readServerAddress(home: string): ServerAddress | null {
  let text: string;

  try {
    text = readFileSync(join(home, serverAddressFile), 'utf8');
  } catch {
    return null;
  }

  return parseServerAddress(text);
}

function parseServerAddress(text: string): ServerAddress | null {
  const address = StoredServerAddress.safeParse(text);

  if (address.success) return address.data;
  reportUnrecognised(text, address.error);

  return null;
}

// Removes server.json only when it names `pid`, so one Server never removes another's file.
export function removeServerAddress(home: string, pid: number): void {
  if (readServerAddress(home)?.pid === pid)
    rmSync(join(home, serverAddressFile), { force: true });
}

function reportUnrecognised(text: string, cause: unknown): void {
  if (text === lastUnrecognisedText) return;
  lastUnrecognisedText = text;
  unrecognisedAddresses += 1;
  console.error(
    `unrecognised ${serverAddressFile} #${unrecognisedAddresses}`,
    cause,
  );
}

export { resolveExecutable } from '@repo/executables';
