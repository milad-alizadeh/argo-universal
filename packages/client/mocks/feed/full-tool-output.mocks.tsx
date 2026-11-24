import { type BlobRef, blobPath, type ToolCallUpdate } from '@repo/contracts';
import { QueryClientProvider } from '@tanstack/react-query';
import { type JSX, type ReactNode, useEffect, useState } from 'react';
import { BlobReadContext } from '#features/connection';
import { FullToolOutputContext } from '../../src/features/feed/hooks/full-tool-output-context';
import { FullToolOutputProvider } from '../../src/features/feed/hooks/use-full-tool-output-query';
import { createQueryClient } from '../../src/query-cache';

const contentBlob: BlobRef = {
  blobId: 'c'.repeat(64),
  mime: 'application/json',
  bytes: 200_000,
};

const rawOutputBlob: BlobRef = {
  blobId: 'd'.repeat(64),
  mime: 'application/json',
  bytes: 200_000,
};

export const previewText = 'The preview: its head, a cut mark, its tail.';

export const wholeText = 'The whole output, from its first line to its last.';

// A tool call whose output the Server cut to a preview and kept whole as a Blob.
export function truncatedToolCall(row: ToolCallUpdate): ToolCallUpdate {
  return {
    ...row,
    content: [
      { type: 'content', content: { type: 'text', text: previewText } },
    ],
    _meta: {
      ...row._meta,
      argo: {
        ...row._meta?.argo,
        truncated: true,
        fullOutput: { content: contentBlob, rawOutput: rawOutputBlob },
      },
    },
  };
}

export interface FullOutputFixture {
  // How many opened rows have asked for their whole output.
  asked: () => number;
  // The whole output reaches every row that asked.
  answer: () => void;
  Provider: (props: { children: ReactNode }) => JSX.Element;
}

// The Feed's shell gives its rows a hook for their whole output; this one asks when a row mounts, as an opened row does, and answers when the test says.
export function fullOutputFixture(): FullOutputFixture {
  const waiting: (() => void)[] = [];
  let asked = 0;

  const useWholeOutput = (row: ToolCallUpdate): ToolCallUpdate => {
    const [arrived, setArrived] = useState(false);

    useEffect(() => {
      asked += 1;
      waiting.push(() => setArrived(true));
    }, []);

    return arrived
      ? {
          ...row,
          content: [
            { type: 'content', content: { type: 'text', text: wholeText } },
          ],
        }
      : row;
  };

  return {
    asked: () => asked,
    answer: () => {
      for (const arrive of waiting.splice(0)) arrive();
    },
    Provider: ({ children }) => (
      <FullToolOutputContext.Provider value={useWholeOutput}>
        {children}
      </FullToolOutputContext.Provider>
    ),
  };
}

export interface ServerBlobs {
  // The Blob route paths read so far, in order.
  reads: () => string[];
  contentPath: string;
  read: (path: string) => Promise<Response>;
}

// The Server's Blob route: it answers the two Blobs a truncated tool call names, and counts what is read.
export function serverBlobs(): ServerBlobs {
  const reads: string[] = [];
  const contentPath = blobPath(contentBlob.blobId);

  return {
    reads: () => reads,
    contentPath,
    read: (path) => {
      reads.push(path);

      return Promise.resolve(
        new Response(
          path === contentPath
            ? JSON.stringify([
                { type: 'content', content: { type: 'text', text: wholeText } },
              ])
            : JSON.stringify({ whole: true }),
        ),
      );
    },
  };
}

// The Feed's shell as the App builds it: a query client, a Blob route, and the real hook for a row's whole output.
export function RealHookPreview({
  blobs,
  children,
}: {
  blobs: ServerBlobs;
  children: ReactNode;
}): JSX.Element {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <BlobReadContext.Provider value={blobs.read}>
        <FullToolOutputProvider>{children}</FullToolOutputProvider>
      </BlobReadContext.Provider>
    </QueryClientProvider>
  );
}
