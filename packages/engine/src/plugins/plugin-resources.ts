import { mkdir, open, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { PluginProcesses } from './plugin-processes.ts';
import type {
  FetchCall,
  FsCall,
  PluginValue,
  ProcessCall,
} from './runtime-protocol.ts';

export const fsReadLimitBytes = 1_048_576;

export const fetchBodyLimitBytes = 5_242_880;

export const fetchTimeoutMs = 30_000;

/*
 * What one Plugin's `argo` calls hold open on the Server: child processes, timers and requests.
 * `release` ends all of them, so a reload, a crash or turning the Plugin off leaves nothing behind.
 */
export class PluginResources {
  private readonly processes = new PluginProcesses();
  private readonly cleanups = new Set<() => void>();
  private released = false;

  release(): void {
    this.released = true;
    this.processes.release();

    for (const cleanup of this.cleanups) cleanup();
  }

  async fs(call: FsCall): Promise<PluginValue> {
    this.assertOpen();

    if (call.action === 'read') return readCapped(call.path);

    return changeOrInspect(call);
  }

  async process(call: ProcessCall): Promise<PluginValue> {
    this.assertOpen();

    return this.processes.handle(call);
  }

  async fetch(call: FetchCall): Promise<PluginValue> {
    this.assertOpen();
    const request = new AbortController();
    const timer = setTimeout(() => request.abort(), fetchTimeoutMs);

    const done = this.hold(() => {
      clearTimeout(timer);
      request.abort();
    });

    try {
      return await requestOnce(call, request.signal);
    } finally {
      done();
    }
  }

  // Registers something `release` must end; the returned function ends it early and forgets it.
  private hold(cleanup: () => void): () => void {
    const once = (): void => {
      cleanup();
      this.cleanups.delete(once);
    };

    this.cleanups.add(once);

    return once;
  }

  private assertOpen(): void {
    if (this.released) throw new Error('Plugin is stopped');
  }
}

function changeOrInspect(
  call: Exclude<FsCall, { action: 'read' }>,
): Promise<PluginValue> {
  if (call.action === 'write') return write(call.path, call.content);

  return call.action === 'list' ? list(call.path) : describe(call.path);
}

async function requestOnce(
  call: FetchCall,
  signal: AbortSignal,
): Promise<PluginValue> {
  const { url, ...init } = call;

  return describeResponse(await fetch(url, { ...init, signal }));
}

async function write(path: string, content: string): Promise<null> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);

  return null;
}

async function readCapped(path: string): Promise<string> {
  const handle = await open(path, 'r');

  try {
    const { size } = await handle.stat();

    if (size > fsReadLimitBytes)
      throw new Error(
        `File is ${size} bytes, over the ${fsReadLimitBytes} byte read limit`,
      );

    return await handle.readFile('utf8');
  } finally {
    await handle.close();
  }
}

async function list(path: string): Promise<PluginValue> {
  const entries = await readdir(path, { withFileTypes: true });

  return entries.map((entry) => ({
    name: entry.name,
    kind: entry.isDirectory() ? 'directory' : 'file',
  }));
}

async function describe(path: string): Promise<PluginValue> {
  const info = await stat(path);

  return {
    kind: info.isDirectory() ? 'directory' : 'file',
    size: info.size,
    modified: info.mtimeMs,
  };
}

async function describeResponse(response: Response): Promise<PluginValue> {
  const text = await response.text();
  const truncated = Buffer.byteLength(text) > fetchBodyLimitBytes;

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers),
    body: truncated ? text.slice(0, fetchBodyLimitBytes) : text,
    truncated,
  };
}
