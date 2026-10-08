import type { VendorMessage } from '../messages';

const command = "printf 'recording-ready' > /tmp/argo54-permission-output.txt";

export const permission = {
  method: 'item/commandExecution/requestApproval',
  id: 0,
  params: {
    kind: 'command',
    threadId: '01a111a9-d4a3-70b1-ac5c-e536b9f609dc',
    turnId: '01a111a9-d69d-7dc3-b6e3-9e5461d6f266',
    itemId: 'exec-47aa717a-33f8-4b74-8f4d-da0ab38091de',
    startedAtMs: 1791297713328,
    environmentId: 'local',
    reason:
      'May I write recording-ready to /tmp/argo54-permission-output.txt outside the workspace?',
    command:
      '/bin/zsh -lc "printf \'recording-ready\' > /tmp/argo54-permission-output.txt"',
    cwd: '/repo',
    commandActions: [
      {
        type: 'unknown',
        command: command,
      },
    ],
    proposedExecpolicyAmendment: ['/bin/zsh', '-lc', command],
    availableDecisions: [
      'accept',
      {
        acceptWithExecpolicyAmendment: {
          execpolicy_amendment: ['/bin/zsh', '-lc', command],
        },
      },
      'cancel',
    ],
  },
} satisfies VendorMessage;
export const elicitation = {
  method: 'item/tool/requestUserInput',
  id: 0,
  params: {
    threadId: '01a111a4-b33a-7163-a9e6-561a7b3b41b9',
    turnId: '01a111a4-b495-70c3-bcfb-b9a951a06bf7',
    itemId: 'call_wzMYhqck2UH591kUvjL5md8X',
    questions: [
      {
        id: 'preferred_color',
        header: 'Color',
        question: 'Which color do you prefer?',
        isOther: true,
        isSecret: false,
        options: [
          {
            label: 'Blue',
            description: 'Choose blue.',
          },
          {
            label: 'Green',
            description: 'Choose green.',
          },
        ],
      },
    ],
    isBlocking: true,
    autoResolutionMs: null,
  },
} satisfies VendorMessage;
