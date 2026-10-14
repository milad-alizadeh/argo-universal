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
): Promise<Uint8Array> => {
  const reader = body.getReader(),
    chunks = new ArchiveChunks();

  try {
    for (;;) {
      const next = await reader.read();

      if (next.done) return chunks.bytes();
      chunks.add(next.value);
    }
  } finally {
    await reader.cancel();
  }
};

export const downloadAgentArchive = async (
  url: string,
  signal: AbortSignal,
): Promise<Uint8Array> => {
  const response = await fetch(url, { signal });

  if (!response.ok)
    throw new Error(`Agent download failed (${response.status})`);

  if (!response.body) throw new Error('Agent download is empty');

  return readArchiveBody(response.body);
};
