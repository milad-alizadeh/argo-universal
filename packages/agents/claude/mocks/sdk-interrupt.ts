import type { BashInput } from '@anthropic-ai/claude-agent-sdk/sdk-tools';
import type { VendorMessage } from '../messages';
import { assistant, user } from './sdk-messages';
import { completed } from './sdk-result';

const rejectedToolResult = {
  ...user([
    {
      type: 'tool_result',
      content:
        "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). STOP what you are doing and wait for the user to tell you how to proceed.\n\nNote: The user's next message may contain a correction or preference. Pay close attention \u2014 if they explain what went wrong or how they'd prefer you to work, consider saving that to memory for future sessions.",
      is_error: true,
      tool_use_id: 'toolu_01RmbdAbVKQQdXJSR61Rrkz3',
    },
  ]),
  tool_result_meta: [
    {
      id: 'toolu_01RmbdAbVKQQdXJSR61Rrkz3',
      non_execution_kind: 'user-rejected',
    },
  ],
};

export const interrupted: VendorMessage[] = [
  assistant('msg_011CfiGVm3SV2PzmfPLkvuGA', [
    {
      type: 'tool_use',
      id: 'toolu_01RmbdAbVKQQdXJSR61Rrkz3',
      name: 'Bash',
      input: {
        command: 'sleep 20 && echo done',
        description: 'Wait 20 seconds then print done',
      } satisfies BashInput,
      caller: { type: 'direct' },
    },
  ]),
  rejectedToolResult,
  user([{ type: 'text', text: '[Request interrupted by user for tool use]' }]),
  {
    ...completed,
    subtype: 'error_during_execution',
    is_error: true,
    errors: [],
    terminal_reason: 'aborted_streaming',
  },
];
