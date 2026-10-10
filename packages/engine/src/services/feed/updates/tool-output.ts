import type { SessionNotification } from '@agentclientprotocol/sdk';
import type {
  BlobRef,
  FeedUpdate,
  TextContent,
  ToolCallContent,
} from '@repo/contracts';
import { contentAddress } from '../../../lib/content-files';
import { previewTexts } from './output-preview';

type ToolRow = Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }>;
type ToolUpdate = Extract<
  SessionNotification['update'],
  { sessionUpdate: 'tool_call' | 'tool_call_update' }
>;
type ArgoToolMeta = NonNullable<NonNullable<ToolRow['_meta']>['argo']>;
type FullOutput = NonNullable<ArgoToolMeta['fullOutput']>;
// The whole value of a capped output field, waiting to be stored as a Blob.
export type OutputBlob = { blob: BlobRef; data: Buffer };
type CappedField<Value> = { value: Value; blob?: OutputBlob };
// The output fields an update supplied, each with its preview and Blob.
type CappedFields = {
  content?: CappedField<ToolRow['content']>;
  rawOutput?: CappedField<ToolRow['rawOutput']>;
};
type ContentBlock = Extract<ToolCallContent, { type: 'content' }>;
type TextBlock = { index: number; block: ContentBlock; text: TextContent };

const toOutputBlob = (text: string): OutputBlob => {
  const data = Buffer.from(text);
  return {
    blob: {
      blobId: contentAddress(data),
      mime: 'application/json',
      bytes: data.length,
    },
    data,
  };
};

const readTextBlocks = (content: readonly ToolCallContent[]): TextBlock[] =>
  content.flatMap((block, index): TextBlock[] =>
    block.type === 'content' && block.content.type === 'text'
      ? [{ index, block, text: block.content }]
      : [],
  );

// Each text block cut to its preview, or left out when the cut drops it whole.
const previewBlocks = (
  blocks: readonly TextBlock[],
  previews: readonly (string | undefined)[],
): Map<number, ToolCallContent[]> =>
  new Map(
    blocks.map(({ index, block, text }, at): [number, ToolCallContent[]] => {
      const preview = previews[at];
      return [
        index,
        preview === undefined
          ? []
          : [{ ...block, content: { ...text, text: preview } }],
      ];
    }),
  );

// The text blocks of `content` share one 64 KB preview; other blocks stay whole.
const capContent = (
  content: ToolRow['content'],
): CappedField<ToolRow['content']> => {
  const blocks = readTextBlocks(content);
  const previews = previewTexts(blocks.map(({ text }): string => text.text));
  if (!previews) return { value: content };
  const replaced = previewBlocks(blocks, previews);
  return {
    value: content.flatMap((block, index) => replaced.get(index) ?? [block]),
    blob: toOutputBlob(JSON.stringify(content)),
  };
};

const capRawOutput = (
  rawOutput: ToolRow['rawOutput'],
): CappedField<ToolRow['rawOutput']> => {
  const text = JSON.stringify(rawOutput);
  const [preview] = previewTexts([text]) ?? [];
  return preview === undefined
    ? { value: rawOutput }
    : { value: preview, blob: toOutputBlob(text) };
};

const readArgo = (row: ToolRow): ArgoToolMeta => row._meta?.argo ?? {};

// A supplied field shows its new Blob, or none; a field left out keeps its earlier one.
const fieldBlob = (
  capped: CappedField<unknown> | undefined,
  earlier: BlobRef | undefined,
): BlobRef | undefined => (capped ? capped.blob?.blob : earlier);

const withoutMissing = ({
  content,
  rawOutput,
}: Record<keyof FullOutput, BlobRef | undefined>): FullOutput => ({
  ...(content && { content }),
  ...(rawOutput && { rawOutput }),
});

const readFullOutput = (row: ToolRow, capped: CappedFields): FullOutput => {
  const earlier = readArgo(row).fullOutput ?? {};
  return withoutMissing({
    content: fieldBlob(capped.content, earlier.content),
    rawOutput: fieldBlob(capped.rawOutput, earlier.rawOutput),
  });
};

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

const withCappedValues = (row: ToolRow, capped: CappedFields): ToolRow => ({
  ...row,
  ...(capped.content && { content: capped.content.value }),
  ...(capped.rawOutput && { rawOutput: capped.rawOutput.value }),
});

const capSuppliedFields = (row: ToolRow, update: ToolUpdate): CappedFields => ({
  ...(update.content && { content: capContent(row.content) }),
  ...(update.rawOutput != null && { rawOutput: capRawOutput(row.rawOutput) }),
});

const blobsOf = (capped: CappedFields): OutputBlob[] =>
  [capped.content?.blob, capped.rawOutput?.blob].filter(
    (blob): blob is OutputBlob => blob !== undefined,
  );

// Caps the output fields this update supplied; a field it left out keeps its earlier preview and Blob.
export const capToolOutput = (
  row: ToolRow,
  update: ToolUpdate,
): { row: ToolRow; blobs: OutputBlob[] } => {
  const capped = capSuppliedFields(row, update);
  return {
    row: markTruncation(
      withCappedValues(row, capped),
      readFullOutput(row, capped),
    ),
    blobs: blobsOf(capped),
  };
};
