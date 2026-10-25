import type { LinkPreviewData } from '@repo/contracts';
import { createRejectionCounter } from '@repo/machine-log';
import { PreviewUnavailable } from './preview-unavailable';

const rejections = createRejectionCounter('Link preview');

type Entry = { expires: number; value: Promise<LinkPreviewData | null> };

type FetchPreview = (href: string) => Promise<LinkPreviewData | null>;

const cacheLimit = 256;

const requestLimit = 8;

const cacheMs = 300_000;

const failureMs = 30_000;

// Per-Server, bounded and single-flight. Failed previews are cached briefly to avoid hammering a host.
export class PreviewCache {
  private readonly entries = new Map<string, Entry>();
  private pending = 0;
  public constructor(private readonly fetch: FetchPreview) {}

  public get(href: string): Promise<LinkPreviewData | null> {
    const cached = this.entries.get(href);

    if (isFresh(cached)) return cached.value;

    if (this.pending >= requestLimit) return Promise.resolve(null);

    return this.start(href);
  }

  private start(href: string): Promise<LinkPreviewData | null> {
    this.evict();
    this.pending++;

    const entry = pendingEntry();

    entry.value = this.fetch(href)
      .catch(noPreview)
      .then((value) => settle(entry, value))
      .finally(() => {
        this.pending--;
      });
    this.entries.set(href, entry);

    return entry.value;
  }

  private evict(): void {
    if (this.entries.size < cacheLimit) return;
    const oldest = this.entries.keys().next().value;

    if (oldest) this.entries.delete(oldest);
  }
}

// A page that cannot give a preview is expected. Any other failure is a fault: it is reported and counted, and the link shows no preview.
function noPreview(cause: unknown): null {
  if (!(cause instanceof PreviewUnavailable))
    rejections.report('Unexpected preview failure', cause);

  return null;
}

function settle(
  entry: Entry,
  value: LinkPreviewData | null,
): LinkPreviewData | null {
  entry.expires = Date.now() + (value ? cacheMs : failureMs);

  return value;
}

function isFresh(entry: Entry | undefined): entry is Entry {
  return entry !== undefined && entry.expires > Date.now();
}

function pendingEntry(): Entry {
  return { expires: Number.POSITIVE_INFINITY, value: Promise.resolve(null) };
}
