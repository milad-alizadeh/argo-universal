const archiveLimit = 268_435_456;

const percentScale = 100;

class ArchiveChunks {
  private readonly chunks: Uint8Array[] = [];
  private size = 0;
  private reported = -1;
  public constructor(
    private readonly total: number,
    private readonly progress: (fraction: number) => void = (): void => {},
  ) {}
  public add(chunk: Uint8Array): void {
    this.size += chunk.length;

    if (this.size > archiveLimit)
      throw new Error('Agent download exceeds 256 MiB');
    this.chunks.push(chunk);
    this.reportProgress();
  }
  public bytes(): Uint8Array {
    return Buffer.concat(this.chunks);
  }
  private reportProgress(): void {
    const percent = Math.min(
      percentScale,
      Math.floor((this.size / this.total) * percentScale),
    );

    const measurable = this.total > 0;

    if (!measurable || percent === this.reported) return;
    this.reported = percent;
    this.progress(percent / percentScale);
  }
}

const readArchiveBody = async (
  body: ReadableStream<Uint8Array>,
  total: number,
  progress?: (fraction: number) => void,
): Promise<Uint8Array> => {
  const reader = body.getReader(),
    chunks = new ArchiveChunks(total, progress);

  try {
    return await readChunks(reader, chunks);
  } finally {
    await reader.cancel();
  }
};

async function readChunks(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  chunks: ArchiveChunks,
): Promise<Uint8Array> {
  for (;;) {
    const next = await reader.read();

    if (next.done) return chunks.bytes();
    chunks.add(next.value);
  }
}

export const downloadAgentArchive = async (
  url: string,
  signal: AbortSignal,
  progress?: (fraction: number) => void,
): Promise<Uint8Array> => {
  const response = await fetch(url, { signal });

  if (!response.ok)
    throw new Error(`Agent download failed (${response.status})`);

  if (!response.body) throw new Error('Agent download is empty');

  return readArchiveBody(response.body, archiveLength(response), progress);
};

const archiveLength = (response: Response): number =>
  response.headers.get('content-encoding')
    ? 0
    : Number(response.headers.get('content-length'));
