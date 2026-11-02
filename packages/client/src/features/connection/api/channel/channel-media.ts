import { bytesBase64 } from './bytes';

const fallbackMime = 'application/octet-stream';

/*
 * The Blobs and Plugin assets of a paired Server, read inside its channel and held as data URIs.
 * The kit asks for a URL it can hand to an image, and a paired Server has no URL (ADR-0045), so this answers with an empty one until the bytes have come and asks its readers to look again once they have.
 */
export class ChannelMedia {
  private readonly loaded = new Map<string, string>();
  private readonly requested = new Set<string>();
  private readonly listeners = new Set<() => void>();
  private version = 0;

  public constructor(private readonly read: typeof fetch) {}

  public readonly subscribe = (changed: () => void): (() => void) => {
    this.listeners.add(changed);

    return () => void this.listeners.delete(changed);
  };

  // Changes whenever something arrives, which is what makes the readers ask for their URLs again.
  public readonly getVersion = (): number => this.version;

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
    this.version += 1;

    for (const listener of this.listeners) listener();
  }

  private async dataUri(path: string): Promise<string> {
    const response = await this.read(path);

    if (!response.ok) throw new Error(`The Server answered ${response.status}`);
    const mime = response.headers.get('content-type') ?? fallbackMime;
    const bytes = new Uint8Array(await response.arrayBuffer());

    return `data:${mime};base64,${bytesBase64(bytes)}`;
  }
}
