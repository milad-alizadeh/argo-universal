import type { SessionUpdate, ToolCallUpdate } from '@repo/contracts';
import type { OutputBlob } from './acp/tool-output';

export const promptBlobIds = (rows: readonly SessionUpdate[]): string[] => [
  ...new Set(
    rows.flatMap((row): string[] =>
      row.sessionUpdate === 'user_message'
        ? row.content.flatMap((block): string[] =>
            'blob' in block && block.blob ? [block.blob.blobId] : [],
          )
        : [],
    ),
  ),
];

const toolOutputIds = (
  meta: NonNullable<ToolCallUpdate['_meta']>['argo'],
): string[] =>
  Object.values(meta?.fullOutput ?? {}).map((blob): string => blob.blobId);

const shownOutputIds = (rows: readonly SessionUpdate[]): Set<string> =>
  new Set(
    rows.flatMap((row): string[] =>
      row.sessionUpdate === 'tool_call_update'
        ? toolOutputIds(row._meta?.argo)
        : [],
    ),
  );

export const outputBlobsOf = (
  rows: readonly SessionUpdate[],
  blobs: readonly OutputBlob[],
): OutputBlob[] => {
  const shown = shownOutputIds(rows);

  return [
    ...new Map(
      blobs.flatMap((blob): [string, OutputBlob][] =>
        shown.has(blob.blob.blobId) ? [[blob.blob.blobId, blob]] : [],
      ),
    ).values(),
  ];
};
