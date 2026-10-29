import { expect } from 'vitest';
import {
  completedToolId,
  failedToolId,
  editedFilePath,
} from './recovery-rows.test.mocks';

export function expectedTool(
  id: string,
  index: number,
): ReturnType<typeof expect.objectContaining> {
  let status = 'cancelled';

  if (id === completedToolId) status = 'completed';
  else if (id === failedToolId) status = 'failed';

  return expect.objectContaining({
    id,
    state: 'settled',
    revision: 22 + index,
    payload: expect.objectContaining({
      status,
      rawInput: { path: editedFilePath },
    }),
  });
}
