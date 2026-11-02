import { open } from 'node:fs/promises';

const readBytes = 65_536;

const tailBytes = 64;

// Claude Code ends a background command's task file with this line, and reports the code nowhere else.
const exitLine = /\[exited with code (-?\d+)\]\s*$/;

const missing = (cause: unknown): boolean =>
  cause instanceof Error && 'code' in cause && cause.code === 'ENOENT';

// The file an Agent writes a background command's output to, read from where the last read stopped.
export class AdapterTaskOutput {
  private offset = 0;
  private tail = '';
  public constructor(
    private readonly path: string,
    private readonly output: (chunk: Buffer) => Promise<void>,
  ) {}
  public get exitCode(): number | undefined {
    const code = exitLine.exec(this.tail)?.[1];

    return code === undefined ? undefined : Number(code);
  }
  public async read(): Promise<void> {
    try {
      await this.readToEnd();
    } catch (cause) {
      if (!missing(cause)) throw cause;
    }
  }
  private async readToEnd(): Promise<void> {
    const file = await open(this.path, 'r');

    try {
      while (await this.readChunk(file));
    } finally {
      await file.close();
    }
  }
  private async readChunk(
    file: Awaited<ReturnType<typeof open>>,
  ): Promise<boolean> {
    const bytes = Buffer.alloc(readBytes);
    const { bytesRead } = await file.read(bytes, 0, readBytes, this.offset);

    if (bytesRead === 0) return false;

    await this.keep(bytes.subarray(0, bytesRead));

    return true;
  }
  private async keep(chunk: Buffer): Promise<void> {
    this.offset += chunk.length;
    this.tail = (this.tail + chunk.toString()).slice(-tailBytes);
    await this.output(chunk);
  }
}
