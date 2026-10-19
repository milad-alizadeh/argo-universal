const archiveLimit = 268_435_456;

class ArchiveChunks {
  private readonly chunks: Uint8Array[] = [];
  private size = 0;
  public add(chunk: Uint8Array): void {
    this.size += chunk.length;

    if (this.size > archiveLimit)
      throw new Error('Agent download exceeds 256 MiB');
    this.chunks.push(chunk);
  }
  public bytes(): Uint8Array {
    return Buffer.concat(this.chunks);
  }
}

const readArchiveBody = async (
  body: ReadableStream<Uint8Array>,
  total: number,
  progress?: (fraction: number) => void,
): Promise<Uint8Array> => {
  const reader = body.getReader(),
    chunks = new ArchiveChunks();
  let received = 0;
  let reported = -1;

  try {
    for (;;) {
      const next = await reader.read();

      if (next.done) return chunks.bytes();
      chunks.add(next.value);
      received += next.value.length;
      const percent = Math.min(100, Math.floor((received / total) * 100));
      if (total > 0 && percent !== reported) {
        reported = percent;
        progress?.(percent / 100);
      }
    }
  } finally {
    await reader.cancel();
  }
};

export const downloadAgentArchive = async (
  url: string,
  signal: AbortSignal,
  progress?: (fraction: number) => void,
): Promise<Uint8Array> => {
  const response = await fetch(url, { signal });

  if (!response.ok)
    throw new Error(`Agent download failed (${response.status})`);

  if (!response.body) throw new Error('Agent download is empty');

  return readArchiveBody(
    response.body,
    response.headers.get('content-encoding')
      ? 0
      : Number(response.headers.get('content-length')),
    progress,
  );
};
