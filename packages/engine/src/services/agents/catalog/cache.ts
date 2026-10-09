import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ACPAgentRegistry } from '@repo/contracts';
import type { createRegistryReader, RegistryPort } from './registry';

export interface RegistrySnapshot {
  registry: ACPAgentRegistry | null;
  fetchedAt: string | null;
  error: string | null;
}

export interface RegistryStorage {
  cachePath: string;
  reader: ReturnType<typeof createRegistryReader>;
  port: RegistryPort;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

function cacheFailure(error: unknown): RegistrySnapshot {
  return {
    registry: null,
    fetchedAt: null,
    error: isMissingCache(error) ? null : errorMessage(error),
  };
}

function isMissingCache(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return 'code' in error && error.code === 'ENOENT';
}

export async function readRegistryCache(
  storage: RegistryStorage,
): Promise<RegistrySnapshot> {
  try {
    const text = await readFile(storage.cachePath, 'utf8');
    const registry = storage.reader.parse(text);
    const cached = await stat(storage.cachePath);
    return { registry, fetchedAt: cached.mtime.toISOString(), error: null };
  } catch (error) {
    return cacheFailure(error);
  }
}

export async function refreshRegistry(
  storage: RegistryStorage,
  signal: AbortSignal,
): Promise<RegistrySnapshot> {
  const registry = storage.reader.parse(
    await storage.port.readRegistry(signal),
  );
  signal.throwIfAborted();
  await writeRegistryCache(storage.cachePath, registry, signal);
  return { registry, fetchedAt: new Date().toISOString(), error: null };
}

async function writeRegistryCache(
  cachePath: string,
  registry: ACPAgentRegistry,
  signal: AbortSignal,
): Promise<void> {
  await mkdir(dirname(cachePath), { recursive: true });
  await writeFile(`${cachePath}.next`, JSON.stringify(registry), { signal });
  signal.throwIfAborted();
  await rename(`${cachePath}.next`, cachePath);
}
