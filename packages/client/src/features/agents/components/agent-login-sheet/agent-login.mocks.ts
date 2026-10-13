import type { AgentLoginSnapshot } from '@repo/contracts';

const browserRequest = {
  id: 'request-42',
  url: 'https://example.com/sign-in',
  message: 'Sign in and enter code ABCD-EFGH',
};

export const loginSnapshot = (
  status: AgentLoginSnapshot['status'],
): AgentLoginSnapshot => ({
  operationId: 'c0fd26a1-960e-4aef-971b-93e978b85ebf',
  agentId: 'example-agent',
  status,
  methods: [
    { id: 'device-code', name: 'Device code' },
    { id: 'browser', name: 'Browser' },
  ],
  request: status === 'awaiting-browser' ? browserRequest : undefined,
});
