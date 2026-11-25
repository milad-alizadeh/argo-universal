import type { ToolCallUpdate } from '@repo/contracts';
import { createContext, use } from 'react';

// A hook the Feed's shell supplies: the row with the whole output in place of its previews once it has come.
export type UseFullToolOutput = (row: ToolCallUpdate) => ToolCallUpdate;

const rowAsSent: UseFullToolOutput = (row) => row;

export const FullToolOutputContext =
  createContext<UseFullToolOutput>(rowAsSent);

// Called by the body of an opened tool call, which mounts only while it is open, so a closed row reads nothing.
export function useOpenedToolCall(row: ToolCallUpdate): ToolCallUpdate {
  const useFullOutput = use(FullToolOutputContext);

  return useFullOutput(row);
}
