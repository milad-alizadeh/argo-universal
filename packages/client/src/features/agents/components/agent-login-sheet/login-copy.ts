import type { AgentLoginSnapshot } from '@repo/contracts';

type Copy = { title: string; message: string };
export const loginCopy: Record<AgentLoginSnapshot['status'], Copy> = {
  'choose-method': {
    title: 'Sign in',
    message:
      'Choose a sign-in method offered by this Agent. Your account stays on the connected Server.',
  },
  starting: {
    title: 'Starting sign-in',
    message: 'Connecting to the Agent on the Server…',
  },
  authenticating: {
    title: 'Starting sign-in',
    message: 'Connecting to the Agent on the Server…',
  },
  'awaiting-browser': {
    title: 'Continue in your browser',
    message:
      'Complete the Agent’s sign-in request in your browser, then return here.',
  },
  checking: {
    title: 'Checking account',
    message:
      'Sign-in finished. Checking that the Agent can use your subscription…',
  },
  ready: {
    title: 'Ready to use',
    message:
      'Subscription sign-in verified. You can open a Session with this Agent.',
  },
  closing: {
    title: 'Cancelling sign-in',
    message: 'Waiting for the Agent’s login resources to close…',
  },
  cancelled: {
    title: 'Sign-in cancelled',
    message: 'The login resources have closed. You can start another sign-in.',
  },
  failed: {
    title: 'Sign-in failed',
    message:
      'The Agent could not complete sign-in. Check your account and try again.',
  },
  'timed-out': {
    title: 'Sign-in timed out',
    message:
      'The login resources have closed. Start again to get a new sign-in request.',
  },
  'in-use': {
    title: 'Agent is in use',
    message: 'Close the Sessions using this account before signing in again.',
  },
  'other-app': {
    title: 'Sign-in already in progress',
    message:
      'Another App started this sign-in. Continue there. This App cannot answer or cancel it.',
  },
  unsupported: {
    title: 'Sign-in unavailable',
    message:
      'This method needs an interaction this App cannot provide. Choose a supported method.',
  },
  'account-rejected': {
    title: 'Subscription could not be verified',
    message:
      'Sign-in completed, but the Agent did not report a compatible subscription account.',
  },
  'cleanup-failed': {
    title: 'Sign-in cleanup failed',
    message:
      'The Server could not confirm that the login resources closed. Another sign-in is blocked.',
  },
};
export const ongoingLogin = (status: AgentLoginSnapshot['status']): boolean =>
  [
    'starting',
    'choose-method',
    'authenticating',
    'awaiting-browser',
    'checking',
    'closing',
  ].includes(status);
