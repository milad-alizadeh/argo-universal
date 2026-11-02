import type { ToolCallUpdate } from '@repo/contracts';

// A recorded command with the description supplied for this scenario.
export const commandWithDescription = (
  row: ToolCallUpdate,
  description: string,
): ToolCallUpdate => ({
  ...row,
  _meta: { ...row._meta, argo: { ...row._meta?.argo, description } },
});
