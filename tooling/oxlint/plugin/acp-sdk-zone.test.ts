import { acpSdkZone } from './acp-sdk-zone.ts';
import { ruleTester } from './rule-tester.ts';

ruleTester.run('acp-sdk-zone', acpSdkZone, {
  valid: [
    "import { z } from 'zod';",
    "import type { Local } from './acp/types';",
    "import { agentclientprotocol } from '@agentclientprotocol-fork/sdk';",
  ],
  invalid: [
    {
      code: "import type { SessionNotification } from '@agentclientprotocol/sdk';",
      errors: [{ messageId: 'acpSdkZone' }],
    },
    {
      code: "import { ClientSideConnection } from '@agentclientprotocol/sdk/schema';",
      errors: [{ messageId: 'acpSdkZone' }],
    },
    {
      code: "export type { PromptRequest } from '@agentclientprotocol/sdk';",
      errors: [{ messageId: 'acpSdkZone' }],
    },
  ],
});
