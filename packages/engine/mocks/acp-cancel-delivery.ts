import { vi } from 'vitest';
import type { ScriptedProcess } from './scripted-agent';

export const playCancelledToolUpdate = (
  process: ScriptedProcess,
): Promise<void> =>
  process.play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'tool_call_update',
          toolCallId: 'unfinished',
          status: 'completed',
        },
      },
    ],
    'owned-1',
  );

export const playLateCancelUpdate = async (
  process: ScriptedProcess,
  marker: boolean,
): Promise<void> => {
  await playCancelledToolUpdate(process);

  await vi.advanceTimersByTimeAsync(60);
  await process.play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'config_option_update',
          configOptions: [
            {
              id: 'delivery-marker',
              name: 'Delivery marker',
              category: 'model_config',
              type: 'boolean',
              currentValue: marker,
            },
          ],
        },
      },
    ],
    'owned-1',
  );
  await vi.advanceTimersByTimeAsync(0);
};
