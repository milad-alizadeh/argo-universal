import type { SessionUpdate, ToolCallUpdate } from '@repo/contracts';
import {
  calledOperation,
  type OperationPresentation,
  recordedOperation,
  recordedIcon,
} from './operation-call';

type OperationRecords = ReadonlyMap<string, OperationPresentation>;

const operationKey = (row: ToolCallUpdate, name: string): string =>
  JSON.stringify([row.sessionId, row.turnId, name]);

export function operationRecords(
  rows: readonly SessionUpdate[],
): OperationRecords {
  const records = new Map<string, OperationPresentation>();

  for (const row of rows) {
    if (row.sessionUpdate === 'tool_call_update') collect(records, row);
  }

  return records;
}

function collect(
  records: Map<string, OperationPresentation>,
  row: ToolCallUpdate,
): void {
  const presentation = recordedOperation(row);

  if (presentation && row.name)
    records.set(operationKey(row, row.name), presentation);
}

const presented = new WeakMap<ToolCallUpdate, ToolCallUpdate>();

function withPresentation(
  row: ToolCallUpdate,
  { label, icon }: OperationPresentation,
): ToolCallUpdate {
  const previous = presented.get(row);

  if (previous && samePresentation(previous, label, icon)) return previous;

  const next = updatePresentation(row, { label, icon });

  presented.set(row, next);

  return next;
}

export function presentOperation(
  row: ToolCallUpdate,
  records: OperationRecords,
): ToolCallUpdate {
  const name = calledOperation(row) ?? '';

  if (name === row.name) return row;

  return applyRecord(row, records.get(operationKey(row, name)));
}

function samePresentation(
  row: ToolCallUpdate,
  label: string,
  icon: OperationPresentation['icon'],
): boolean {
  return row.title === label && recordedIcon(row) === icon;
}

function updatePresentation(
  row: ToolCallUpdate,
  { label, icon }: OperationPresentation,
): ToolCallUpdate {
  return {
    ...row,
    title: label,
    _meta: { ...row._meta, argo: { ...row._meta?.argo, operationIcon: icon } },
  };
}

function applyRecord(
  row: ToolCallUpdate,
  presentation?: OperationPresentation,
): ToolCallUpdate {
  return presentation ? withPresentation(row, presentation) : row;
}
