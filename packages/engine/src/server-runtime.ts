import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ServerAddress } from '@repo/contracts';

const serverAddressFile = 'server.json';
let unrecognisedAddresses = 0;

// The Server and desktop share the ARGO_HOME boundary, including an empty override.
export const resolveRuntimeDirectory = (): string =>
  process.env.ARGO_HOME ?? join(homedir(), '.argo');

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

// The address in server.json; a missing file is null, and a damaged or foreign one is rejected, reported and counted.
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
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    return reportUnrecognised(error);
  }
  const address = ServerAddress.safeParse(json);
  return address.success ? address.data : reportUnrecognised(address.error);
}

// Removes server.json only when it names `pid`, so one Server never removes another's file.
export function removeServerAddress(home: string, pid: number): void {
  if (readServerAddress(home)?.pid === pid)
    rmSync(join(home, serverAddressFile), { force: true });
}

function reportUnrecognised(error: unknown): null {
  unrecognisedAddresses += 1;
  console.error(
    `unrecognised ${serverAddressFile} #${unrecognisedAddresses}`,
    error,
  );
  return null;
}
