import { z } from 'zod';

const contentSchema = z.object({
  content: z.array(
    z.object({ type: z.string(), text: z.string().optional() }).passthrough(),
  ),
  isError: z.boolean().optional(),
});
const rpcSchema = z.object({
  result: z.unknown().optional(),
  error: z.unknown().optional(),
});

export class PaperClient {
  private session = '';
  private sequence = 0;
  private endpoint: string;

  public constructor(endpoint = 'http://127.0.0.1:29979/mcp') {
    this.endpoint = endpoint;
  }

  public async connect(): Promise<void> {
    await this.request('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'argo-paper-sync', version: '0.1.0' },
    });
    await this.call('get_guide', { topic: 'paper-mcp-instructions' });
  }

  private async request(method: string, params: object): Promise<unknown> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(60_000),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...(this.session ? { 'Mcp-Session-Id': this.session } : {}),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++this.sequence,
        method,
        params,
      }),
    });
    if (!response.ok)
      throw new Error(
        `Paper HTTP ${response.status}: ${await response.text()}`,
      );
    this.session = response.headers.get('mcp-session-id') ?? this.session;
    return this.decode(await response.text());
  }

  private decode(body: string): unknown {
    const payload = body.startsWith('event:')
      ? body
          .split('\n')
          .filter((line) => line.startsWith('data: '))
          .map((line) => line.slice(6))
          .join('\n')
      : body;
    const envelope = rpcSchema.parse(JSON.parse(payload));
    if (envelope.error) throw new Error(JSON.stringify(envelope.error));
    return envelope.result;
  }

  public async call(name: string, args: object): Promise<string[]> {
    const result = contentSchema.parse(
      await this.request('tools/call', { name, arguments: args }),
    );
    const texts = result.content.flatMap((entry) =>
      entry.text === undefined ? [] : [entry.text],
    );
    if (result.isError) throw new Error(`${name}: ${texts.join('\n')}`);
    for (const text of texts) {
      if (!text.trimStart().startsWith('{')) continue;
      const value: unknown = JSON.parse(text);
      const header = z
        .object({ file: z.object({ id: z.string() }) })
        .safeParse(value);
      if (
        header.success &&
        'fileId' in args &&
        header.data.file.id !== args.fileId
      )
        throw new Error(`${name}: wrong Paper file`);
      rejectErrors(value, name);
    }
    return texts;
  }

  public async read<T>(
    name: string,
    args: object,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const texts = await this.call(name, args);
    for (const text of texts) {
      if (!text.trimStart().startsWith('{')) continue;
      const parsed = schema.safeParse(JSON.parse(text));
      if (parsed.success) return parsed.data;
    }
    throw new Error(
      `${name}: expected structured response, received ${texts.join('\n').slice(0, 800)}`,
    );
  }
}

function rejectErrors(value: unknown, name: string): void {
  if (value === null || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (key === 'error' && item)
      throw new Error(`${name}: ${JSON.stringify(item)}`);
    if (
      key === 'ignoredStyles' &&
      item &&
      typeof item === 'object' &&
      Object.keys(item).length
    )
      throw new Error(`${name}: ignored styles ${JSON.stringify(item)}`);
    rejectErrors(item, name);
  }
}
