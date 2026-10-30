import type { FeedSubscribeOutput, ToolCallUpdate } from '@repo/contracts';

export async function nextOperationRow(
  events: AsyncIterable<FeedSubscribeOutput>,
  except: string,
): Promise<ToolCallUpdate> {
  for await (const event of events) {
    const row = operationRow(event, except);

    if (row) return row;
  }

  throw new Error('The Feed closed before the Operation row');
}

function operationRow(
  event: FeedSubscribeOutput,
  except: string,
): ToolCallUpdate | undefined {
  if (event.type !== 'row.upsert') return;

  return archiveRow(event.row, except);
}

const archiveRow = (
  row: Extract<FeedSubscribeOutput, { type: 'row.upsert' }>['row'],
  except: string,
): ToolCallUpdate | undefined => {
  if (row.sessionUpdate !== 'tool_call_update') return;

  return isOtherArchive(row, except) ? row : undefined;
};

const isOtherArchive = (row: ToolCallUpdate, except: string): boolean =>
  row.name === 'session.archive' && row.toolCallId !== except;
