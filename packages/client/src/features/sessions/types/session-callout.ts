import type { AgentAuthState } from '@repo/contracts';
import type { LoginTerminalProps } from '#features/agents';

export type AuthCalloutMethod = Pick<
  AgentAuthState['methods'][number],
  'id' | 'name' | 'description'
>;

export interface AuthCalloutProps {
  agentName: string;
  // Agent and terminal methods, in the Agent's order.
  methods: readonly AuthCalloutMethod[];
  // The Agent's own words from `auth_required`, shown when there is one method.
  message?: string;
  // Why this Device's last attempt failed, until the next one starts.
  failure?: string;
  // A sign-in is running, from this Device or another.
  pending: boolean;
  // The running method is a terminal: on a phone its sheet takes the callout's place.
  terminal?: boolean;
  onAuthenticate: (methodId: string) => void;
  onCancel: () => void;
}

export interface AuthRequiredCardProps {
  // The Agent's own words when its Turn ended with `auth_required`.
  description?: string;
  onAuthenticate: () => void;
}

export interface LaunchCalloutProps {
  // How the Agent stopped, then the last stderr block; or the error text alone.
  message: string;
  onRetry: () => void;
}

// Each callout kind's props.
type CalloutKinds = {
  loading: { title?: string; progress?: number | null };
  authenticate: AuthCalloutProps;
  'auth-required': AuthRequiredCardProps;
  launch: LaunchCalloutProps;
};

export type CalloutKind = keyof CalloutKinds;

export type KindProps<Kind extends CalloutKind> = {
  kind: Kind;
} & CalloutKinds[Kind];

// The one callout above a Session's Composer: sign in, a Turn that needs sign-in, an Agent that failed to launch, or its open running again.
export type SessionCalloutProps = {
  [Kind in CalloutKind]: KindProps<Kind>;
}[CalloutKind];

export interface TerminalSignInProps {
  // The sign-in method's name.
  title: string;
  terminal: Omit<LoginTerminalProps, 'enabled'>;
  // Closing before the command exits means the sign-in failed.
  onClose: () => void;
}

// What a Session page draws for sign-in and launch trouble: the callout above the Composer, and a terminal method's panel or sheet.
export interface SessionCallouts {
  callout?: SessionCalloutProps;
  signInTerminal?: TerminalSignInProps;
}
