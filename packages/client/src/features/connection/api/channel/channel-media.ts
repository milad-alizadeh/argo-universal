import { bytesBase64 } from './bytes';

const fallbackMime = 'application/octet-stream';

/*
 * The Blobs and Plugin assets of a paired Server, read inside its channel and held as data URIs.
 * The kit asks for a URL it can hand to an image, and a paired Server has no URL (ADR-0045), so this answers with an empty one until the bytes have come. A reader watches its own path: watching starts the read, tells that reader when the bytes arrive, and stops the read if every watcher leaves first, so a row that scrolled away does not keep the queue.
 * Where the bytes are kept is this class's one seam: the images cached on the Device (#2694) replace `dataUri` and what readers hear stays the same. `loaded` is unbounded until then.
 */
export class ChannelMedia {
  private readonly loaded = new Map<string, string>();
  private readonly reading = new Map<string, AbortController>();
  private readonly preloaded = new Set<string>();
  private readonly listeners = new Map<string, Set<() => void>>();

  public constructor(private readonly read: typeof fetch) {}

  // Told when `path` has arrived, and only then: what is drawn from another path is not asked to draw again.
  public readonly watch = (path: string, changed: () => void): (() => void) => {
    const watching = this.listeners.get(path) ?? new Set<() => void>();
    watching.add(changed);
    this.listeners.set(path, watching);
    void this.load(path);

    return () => {
      watching.delete(changed);

      if (watching.size === 0) this.abandon(path);
    };
  };

  // Reads `path` for a caller that cannot watch it, and keeps it whether or not anyone does.
  public preload(path: string): void {
    this.preloaded.add(path);
    void this.load(path);
  }

  // What has arrived for `path`, or an empty URL. Asking changes nothing.
  public urlFor(path: string): string {
    return this.loaded.get(path) ?? '';
  }

  private abandon(path: string): void {
    if (this.preloaded.has(path)) return;
    this.reading.get(path)?.abort();
    this.reading.delete(path);
  }

  private async load(path: string): Promise<void> {
    if (this.loaded.has(path) || this.reading.has(path)) return;
    const reading = new AbortController();
    this.reading.set(path, reading);

    try {
      this.keep(path, await this.dataUri(path, reading.signal));
    } catch (cause) {
      // Forgotten, so the next watcher reads again. A read stopped on purpose is not an error.
      if (this.reading.get(path) === reading) this.reading.delete(path);

      if (!reading.signal.aborted)
        console.error(`Could not read ${path} from the Server`, cause);
    }
  }

  private keep(path: string, uri: string): void {
    this.loaded.set(path, uri);
    this.reading.delete(path);

    for (const listener of this.listeners.get(path) ?? []) listener();
  }

  private async dataUri(path: string, signal: AbortSignal): Promise<string> {
    const response = await this.read(path, { signal });

    if (!response.ok) throw new Error(`The Server answered ${response.status}`);
    const mime = response.headers.get('content-type') ?? fallbackMime;
    const bytes = new Uint8Array(await response.arrayBuffer());

    return `data:${mime};base64,${bytesBase64(bytes)}`;
  }
}
