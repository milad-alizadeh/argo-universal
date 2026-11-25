import { ToolCallContent, type ToolCallUpdate } from '@repo/contracts';
import { z } from 'zod';

type OutputField = 'content' | 'rawOutput';

// The text of the Blobs that hold a row's whole output, by the field each one stands for.
export type FullOutputText = Partial<Record<OutputField, string>>;

// The Blobs that hold what a row's previews cut: none for a row that was sent whole.
export function fullOutputBlobIds(
  row: ToolCallUpdate,
): Partial<Record<OutputField, string>> {
  const { content, rawOutput } = row._meta?.argo?.fullOutput ?? {};

  return {
    ...(content && { content: content.blobId }),
    ...(rawOutput && { rawOutput: rawOutput.blobId }),
  };
}

const ContentBlocks = z.array(ToolCallContent);

const readJson = (text: string): { value: unknown } | undefined => {
  try {
    return { value: JSON.parse(text) };
  } catch {
    return undefined;
  }
};

const readContent = (
  text: string | undefined,
): ToolCallUpdate['content'] | undefined => {
  const json = text === undefined ? undefined : readJson(text);
  const blocks = ContentBlocks.safeParse(json?.value);

  return blocks.success ? blocks.data : undefined;
};

/*
 * The row with the whole output in place of its previews, once the Blobs have come.
 * A field whose Blob has not come, or is not what the Server said it was, keeps its preview; with nothing to put in place the row itself comes back, so what draws from it does not draw again.
 */
export function withFullOutput(
  row: ToolCallUpdate,
  full: FullOutputText,
): ToolCallUpdate {
  const content = readContent(full.content);

  const rawOutput =
    full.rawOutput === undefined ? undefined : readJson(full.rawOutput);

  if (!content && !rawOutput) return row;

  return {
    ...row,
    ...(content && { content }),
    ...(rawOutput && { rawOutput: rawOutput.value }),
  };
}
