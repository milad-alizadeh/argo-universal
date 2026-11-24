import type { ToolCallUpdate } from '@repo/contracts';
import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useTRPC } from '#features/connection';
import { fullOutputBlobIds, withFullOutput } from '../view/full-tool-output';
import { FullToolOutputContext } from './full-tool-output-context';

const minuteMs = 60_000,
  minutesKept = 30;

// A Blob is named by the hash of its content, so what a read brought never goes stale: it is kept for as long as the Feed's lists are.
const keptFor = minutesKept * minuteMs;

// The text of one Blob, read when an opened row asks and not before. An older Server has no `blob.text`: its read fails once and the row keeps its preview.
function useBlobText(blobId: string | undefined): string | undefined {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.blob.text.queryOptions({ blobId: blobId ?? '' }),
    enabled: blobId !== undefined,
    staleTime: Infinity,
    gcTime: keptFor,
    retry: false,
  }).data;
}

/*
 * A row's previews stand in until the Blobs with its whole output have come; then the whole output takes their place.
 * Only an opened row calls this, so a closed row costs the Feed no read.
 */
export function useFullToolOutput(row: ToolCallUpdate): ToolCallUpdate {
  const blobs = fullOutputBlobIds(row);
  const content = useBlobText(blobs.content);

  // A row draws its raw output only when it has no content blocks, so a row with some never reads it.
  const rawOutput = useBlobText(
    row.content.length === 0 ? blobs.rawOutput : undefined,
  );

  return withFullOutput(row, { content, rawOutput });
}

// Supplies `useFullToolOutput` to every tool call below it.
export function FullToolOutputProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <FullToolOutputContext.Provider value={useFullToolOutput}>
      {children}
    </FullToolOutputContext.Provider>
  );
}
