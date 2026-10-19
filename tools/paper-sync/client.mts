import { z } from 'zod';
import { selectedFiles } from './config.mts';
import {
  decodeRpc,
  jsonBlocks,
  toolTexts,
  type JsonValue,
  type RpcArguments,
} from './wire.mts';

export class PaperClient {
  public calls = 0;
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
      clientInfo: { name: 'argo-paper-sync', version: '0.2.0' },
    });
    await this.call('get_guide', { topic: 'paper-mcp-instructions' });
  }
  private headers(): Headers {
    const headers = new Headers({
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    });

    if (this.session) headers.set('Mcp-Session-Id', this.session);

    return headers;
  }
  private async send(body: string): Promise<Response> {
    this.calls += 1;

    return fetch(this.endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(60_000),
      headers: this.headers(),
      body,
    });
  }
  private async request(
    method: string,
    params: RpcArguments,
  ): Promise<JsonValue> {
    const envelope = { jsonrpc: '2.0', id: ++this.sequence, method, params };
    const body = JSON.stringify(envelope);

    const response = await this.send(body);

    if (!response.ok)
      throw new Error(
        `Paper HTTP ${response.status}: ${await response.text()}`,
      );
    this.session = response.headers.get('mcp-session-id') ?? this.session;

    return decodeRpc(await response.text());
  }
  public async call(name: string, args: RpcArguments): Promise<string[]> {
    if (typeof args.fileId === 'string') selectedFiles(args.fileId);
    const value = await this.request('tools/call', { name, arguments: args });

    return toolTexts(value, { name, args });
  }
  public async read<T>(
    name: string,
    args: RpcArguments,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const texts = await this.call(name, args);

    for (const block of jsonBlocks(texts)) {
      const parsed = schema.safeParse(block);

      if (parsed.success) return parsed.data;
    }

    throw new Error(
      `${name}: expected structured response, received ${texts.join('\n').slice(0, 800)}`,
    );
  }
}
