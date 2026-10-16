import type { AuthCalloutMethod, AuthCalloutProps } from './auth-callout';

const chatGpt: AuthCalloutMethod = {
  id: 'chatgpt',
  name: 'Login with ChatGPT',
  description: 'Use your ChatGPT subscription',
};

const apiKey: AuthCalloutMethod = {
  id: 'codex-api-key',
  name: 'Use CODEX_API_KEY',
  description: 'Requires setting the CODEX_API_KEY environment variable',
};

const openAiKey: AuthCalloutMethod = {
  id: 'openai-api-key',
  name: 'Use OPENAI_API_KEY',
  description: 'Requires setting the OPENAI_API_KEY environment variable',
};

type AuthCalloutData = Omit<AuthCalloutProps, 'onAuthenticate' | 'onCancel'>;

const signIn = { agentName: 'Codex', pending: false };

// Codex's sign-in methods, in the order Codex lists them.
export const codexMethods = { chatGpt, apiKey, openAiKey };

// What each callout shows; stories add their own callbacks.
export const authCallouts = {
  oneMethod: { ...signIn, methods: [chatGpt] },
  agentMessage: {
    ...signIn,
    methods: [chatGpt],
    message: 'Sign in with ChatGPT to use Codex.',
  },
  severalMethods: { ...signIn, methods: [chatGpt, apiKey, openAiKey] },
  pending: { ...signIn, methods: [chatGpt], pending: true },
} satisfies Record<string, AuthCalloutData>;
