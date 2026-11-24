import { bytesBase64 } from './bytes';

const fallbackMime = 'application/octet-stream';

/*
 * The Blobs and Plugin assets of a paired Server, read inside its channel and held as data URIs.
 * The kit asks for a URL it can hand to an image, and a paired Server has no URL (ADR-0045), so this answers with an empty one until the bytes have come and tells the readers of that one path to look again once they have.
 * Where the bytes are kept is this class's one seam: the images cached on the Device (#2694) replace `dataUri`, and what readers hear stays the same.
 */
export class ChannelMedia {
  private readonly loaded = new Map<string, string>();
  private readonly requested = new Set<string>();
  private readonly listeners = new Map<string, Set<() => void>>();

  public constructor(private readonly read: typeof fetch) {}

  // Told when `path` has arrived, and only then: what is drawn from another path is not asked to draw again.
  public readonly watch = (path: string, changed: () => void): (() => void) => {
    const watching = this.listeners.get(path) ?? new Set<() => void>();
    watching.add(changed);
    this.listeners.set(path, watching);

    return () => void watching.delete(changed);
  };

  public urlFor(path: string): string {
    void this.load(path);

    return this.loaded.get(path) ?? '';
  }

  private async load(path: string): Promise<void> {
    if (this.requested.has(path)) return;
    this.requested.add(path);

    try {
      this.keep(path, await this.dataUri(path));
    } catch (cause) {
      // Forgotten, so the next time the screen asks it tries again; nothing re-renders on a failure, so this cannot loop.
      this.requested.delete(path);
      console.error(`Could not read ${path} from the Server`, cause);
    }
  }

  private keep(path: string, uri: string): void {
    this.loaded.set(path, uri);

    for (const listener of this.listeners.get(path) ?? []) listener();
  }

  private async dataUri(path: string): Promise<string> {
    const response = await this.read(path);

    if (!response.ok) throw new Error(`The Server answered ${response.status}`);
    const mime = response.headers.get('content-type') ?? fallbackMime;
    const bytes = new Uint8Array(await response.arrayBuffer());

    return `data:${mime};base64,${bytesBase64(bytes)}`;
  }
}
