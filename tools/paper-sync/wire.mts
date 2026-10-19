import { z } from 'zod';

export type JsonValue = z.infer<ReturnType<typeof z.json>>;

export type RpcArguments = { [key: string]: JsonValue };

const rpcSchema = z.object({
  result: z.json().optional(),
  error: z.json().optional(),
});

const contentSchema = z.object({
  content: z.array(
    z.object({ type: z.string(), text: z.string().optional() }).passthrough(),
  ),
  isError: z.boolean().optional(),
});

const headerSchema = z.object({ file: z.object({ id: z.string() }) });

export function decodeRpc(body: string): JsonValue {
  const payload = rpcPayload(body);
  const envelope = rpcSchema.parse(JSON.parse(payload));

  if (envelope.error) throw new Error(JSON.stringify(envelope.error));

  if (envelope.result === undefined)
    throw new Error('Paper returned no RPC result');

  return envelope.result;
}

function eventData(body: string): string {
  return body
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice(6))
    .join('\n');
}

export function jsonBlocks(texts: string[]): JsonValue[] {
  return texts
    .values()
    .filter((text) => text.trimStart().startsWith('{'))
    .map((text) => z.json().parse(JSON.parse(text)))
    .toArray();
}

function checkHeader(value: JsonValue, args: RpcArguments): void {
  const header = headerSchema.safeParse(value);

  if (!header.success) return;
  const fileId = args.fileId;

  if (fileId === undefined) return;

  assertFile(header.data.file.id, fileId);
}

function isContainer(value: JsonValue): value is RpcArguments | JsonValue[] {
  return value !== null && typeof value === 'object';
}

function checkEntry(key: string, value: JsonValue, name: string): void {
  if (key === 'error') rejectError(value, name);

  if (key === 'ignoredStyles') checkIgnoredStyles(value, name);
}

function checkIgnoredStyles(value: JsonValue, name: string): void {
  if (isContainer(value) && Object.keys(value).length)
    throw new Error(`${name}: ignored styles ${JSON.stringify(value)}`);
}

function rejectErrors(value: JsonValue, name: string): void {
  if (!isContainer(value)) return;

  for (const [key, item] of Object.entries(value)) {
    checkEntry(key, item, name);
    rejectErrors(item, name);
  }
}

export function toolTexts(
  value: JsonValue,
  request: { name: string; args: RpcArguments },
): string[] {
  const result = contentSchema.parse(value);

  const texts = result.content.flatMap((entry) =>
    entry.text === undefined ? [] : [entry.text],
  );

  if (result.isError) throw new Error(`${request.name}: ${texts.join('\n')}`);

  for (const block of jsonBlocks(texts)) {
    checkHeader(block, request.args);
    rejectErrors(block, request.name);
  }

  return texts;
}

function rpcPayload(body: string): string {
  return body.startsWith('event:') ? eventData(body) : body;
}

function assertFile(actual: string, expected: JsonValue): void {
  if (actual !== expected) throw new Error('Wrong Paper file');
}

function rejectError(value: JsonValue, name: string): void {
  if (value) throw new Error(`${name}: ${JSON.stringify(value)}`);
}
