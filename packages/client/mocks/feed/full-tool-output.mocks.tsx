import type { BlobRef, ToolCallUpdate } from '@repo/contracts';
import { type JSX, type ReactNode, useEffect, useState } from 'react';
import { FullToolOutputContext } from '../../src/features/feed/hooks/full-tool-output-context';

const contentBlob: BlobRef = {
  blobId: 'c'.repeat(64),
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
        fullOutput: { content: contentBlob },
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
