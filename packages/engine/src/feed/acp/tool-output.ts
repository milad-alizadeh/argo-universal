import { createHash } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import type { SessionNotification } from '@agentclientprotocol/sdk';
import type {
  BlobRef,
  FeedUpdate,
  TextContent,
  ToolCallContent,
} from '@repo/contracts';

type ToolRow = Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }>;
type ToolUpdate = Extract<
  SessionNotification['update'],
  { sessionUpdate: 'tool_call' | 'tool_call_update' }
>;
type ArgoToolMeta = NonNullable<NonNullable<ToolRow['_meta']>['argo']>;
type FullOutput = NonNullable<ArgoToolMeta['fullOutput']>;
type OutputField = keyof FullOutput;
// The whole value of a capped output field, waiting to be stored as a Blob.
export type OutputBlob = { blob: BlobRef; data: Buffer };
type CappedField = { value: unknown; blob?: OutputBlob };

const previewBytes = 65_536;
const sideBytes = 32_768;
const cutMark = '\n…\n';
const continuationMask = 0xc0;
const continuationBits = 0x80;

// A UTF-8 byte inside a character, never its first.
const isContinuationByte = (byte: number): boolean =>
  (byte & continuationMask) === continuationBits;

const toOutputBlob = (text: string): OutputBlob => {
  const data = Buffer.from(text);
  const blobId = createHash('sha256').update(data).digest('hex');
  return {
    blob: { blobId, mime: 'application/json', bytes: data.length },
    data,
  };
};

// The first and last 32 KB of a text over 64 KB, cut on whole characters.
const capText = (text: string): string | undefined => {
  const bytes = Buffer.from(text);
  if (bytes.length <= previewBytes) return undefined;
  const head = new StringDecoder('utf8').write(bytes.subarray(0, sideBytes));
  const tail = bytes.subarray(-sideBytes);
  const start = tail.findIndex((byte): boolean => !isContinuationByte(byte));
  return `${head}${cutMark}${tail.subarray(start).toString()}`;
};

const withText = (
  block: Extract<ToolCallContent, { type: 'content' }>,
  content: TextContent,
  text: string | undefined,
): ToolCallContent =>
  text === undefined ? block : { ...block, content: { ...content, text } };

const capBlock = (block: ToolCallContent): ToolCallContent => {
  if (block.type !== 'content' || block.content.type !== 'text') return block;
  return withText(block, block.content, capText(block.content.text));
};

const capContent = (content: ToolCallContent[]): CappedField => {
  const capped = content.map(capBlock);
  return capped.some((block, index): boolean => block !== content[index])
    ? { value: capped, blob: toOutputBlob(JSON.stringify(content)) }
    : { value: content };
};

const capRawOutput = (rawOutput: unknown): CappedField => {
  const text = JSON.stringify(rawOutput);
  const preview = capText(text);
  return preview === undefined
    ? { value: rawOutput }
    : { value: preview, blob: toOutputBlob(text) };
};

// The output fields this update supplied, each with its preview and Blob.
const capSuppliedFields = (
  row: ToolRow,
  update: ToolUpdate,
): Partial<Record<OutputField, CappedField>> => ({
  ...(update.content && { content: capContent(row.content) }),
  ...(update.rawOutput != null && { rawOutput: capRawOutput(row.rawOutput) }),
});

const readArgo = (row: ToolRow): ArgoToolMeta => row._meta?.argo ?? {};

// The Blobs of the fields left out, then the new Blobs of the fields supplied.
const readFullOutput = (
  row: ToolRow,
  capped: Partial<Record<OutputField, CappedField>>,
): FullOutput =>
  Object.fromEntries([
    ...Object.entries(readArgo(row).fullOutput ?? {}).filter(
      ([field]): boolean => !Object.hasOwn(capped, field),
    ),
    ...Object.entries(capped).flatMap(([field, { blob }]) =>
      blob ? [[field, blob.blob] as const] : [],
    ),
  ]);

const withTruncation = (row: ToolRow, fullOutput: FullOutput): ToolRow => {
  const argo: ArgoToolMeta = { ...readArgo(row) };
  delete argo.truncated;
  delete argo.fullOutput;
  if (Object.keys(fullOutput).length > 0)
    Object.assign(argo, { truncated: true, fullOutput });
  return { ...row, _meta: { ...row._meta, argo } };
};

// A row that never held capped output stays without Argo truncation fields.
const markTruncation = (row: ToolRow, fullOutput: FullOutput): ToolRow => {
  if (readArgo(row).truncated !== true && Object.keys(fullOutput).length === 0)
    return row;
  return withTruncation(row, fullOutput);
};

const readCappedValues = (
  capped: Partial<Record<OutputField, CappedField>>,
): Partial<ToolRow> =>
  Object.fromEntries(
    Object.entries(capped).map(([field, { value }]) => [field, value]),
  );

// Caps the output fields this update supplied; a field it left out keeps its earlier preview and Blob.
export const capToolOutput = (
  row: ToolRow,
  update: ToolUpdate,
): { row: ToolRow; blobs: OutputBlob[] } => {
  const capped = capSuppliedFields(row, update);
  return {
    row: markTruncation(
      { ...row, ...readCappedValues(capped) },
      readFullOutput(row, capped),
    ),
    blobs: Object.values(capped).flatMap(({ blob }) => (blob ? [blob] : [])),
  };
};
