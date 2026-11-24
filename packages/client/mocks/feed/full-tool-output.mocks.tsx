import {
  type BlobRef,
  BlobTextInput,
  type ToolCallUpdate,
} from '@repo/contracts';
import type { AppRouter } from '@repo/engine/router';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createTRPCClient,
  TRPCClientError,
  type TRPCClient,
  type TRPCLink,
} from '@trpc/client';
import { type Observer, observable } from '@trpc/server/observable';
import { type JSX, type ReactNode, useState } from 'react';
import { TRPCProvider } from '#features/connection';
import { FullToolOutputProvider } from '../../src/features/feed/hooks/use-full-tool-output';
import { createQueryClient } from '../../src/query-cache';

type Wire = Observer<
  { result: { type: 'data'; data: string } },
  TRPCClientError<AppRouter>
>;

const contentBlobId = 'c'.repeat(64);

const rawOutputBlobId = 'd'.repeat(64);

const blob = (blobId: string): BlobRef => ({
  blobId,
  mime: 'application/json',
  bytes: 200_000,
});

export const previewText = 'The preview: its head, a cut mark, its tail.';

export const wholeText = 'The whole output, from its first line to its last.';

// A tool call whose output the Server cut to a preview and kept whole as two Blobs.
export function truncatedToolCall(row: ToolCallUpdate): ToolCallUpdate {
  return {
    ...row,
    content: [
      { type: 'content', content: { type: 'text', text: previewText } },
    ],
    rawOutput: undefined,
    _meta: {
      ...row._meta,
      argo: {
        ...row._meta?.argo,
        truncated: true,
        fullOutput: {
          content: blob(contentBlobId),
          rawOutput: blob(rawOutputBlobId),
        },
      },
    },
  };
}

const blobTexts = new Map([
  [
    contentBlobId,
    JSON.stringify([
      { type: 'content', content: { type: 'text', text: wholeText } },
    ]),
  ],
  [rawOutputBlobId, JSON.stringify({ whole: true })],
]);

export interface FullOutputServer {
  // The Blob id of each `blob.text` the App has asked.
  reads: string[];
  // Answers every read that waits; none are answered until it is called.
  answer: () => void;
  // Fails each read from now on, as a Server built before `blob.text` does.
  refuse: () => void;
}

interface FullOutputFixture {
  server: FullOutputServer;
  client: TRPCClient<AppRouter>;
}

// The Server's answers to `blob.text`, from a fake link that records what it was asked.
export function fullOutputServer(): FullOutputFixture {
  const waiting: (() => void)[] = [];
  let refusing = false;

  const server: FullOutputServer = {
    reads: [],
    answer: () => {
      for (const answer of waiting.splice(0)) answer();
    },
    refuse: () => {
      refusing = true;
    },
  };

  const link: TRPCLink<AppRouter> =
    () =>
    ({ op }) =>
      observable((wire: Wire) => {
        if (op.path !== 'blob.text')
          throw new Error(`Unexpected request: ${op.path}`);
        const { blobId } = BlobTextInput.parse(op.input);
        server.reads.push(blobId);

        waiting.push(() => {
          if (refusing)
            wire.error(TRPCClientError.from(new Error('No such procedure')));
          else {
            wire.next({
              result: { type: 'data', data: blobTexts.get(blobId) ?? '' },
            });
            wire.complete();
          }
        });

        return (): void => {};
      });

  return { server, client: createTRPCClient<AppRouter>({ links: [link] }) };
}

// What the Feed's shell wraps every row in: a query client, tRPC, and the whole-output hook.
export function FullOutputPreview({
  client,
  children,
}: {
  client: TRPCClient<AppRouter>;
  children: ReactNode;
}): JSX.Element {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={client} queryClient={queryClient}>
        <FullToolOutputProvider>{children}</FullToolOutputProvider>
      </TRPCProvider>
    </QueryClientProvider>
  );
}
