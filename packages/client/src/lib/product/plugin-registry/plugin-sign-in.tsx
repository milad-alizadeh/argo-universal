import { Icon } from '@repo/kit/primitives/content/icon';
import { SignIn, type SignInProps } from '@repo/kit/primitives/status/sign-in';
import type { SystemSymbolSource } from '@repo/kit/symbols/symbol-source';
import { createContext, use, type ReactNode } from 'react';

// The Plugin whose page draws: its own symbol, for a SignIn that sends no mark of its own.
export const PluginSymbolContext = createContext<SystemSymbolSource | null>(
  null,
);

function ownMark(
  symbol: SystemSymbolSource | null,
  signedIn: boolean,
): ReactNode {
  if (!symbol) return undefined;

  return <Icon name={symbol} size="lg" tone={signedIn ? 'success' : 'info'} />;
}

// A Plugin's sign-in draws the service's logo when the Plugin sends one, and the Plugin's own icon when it does not.
export function PluginSignIn(props: SignInProps): ReactNode {
  const symbol = use(PluginSymbolContext);

  return (
    <SignIn
      {...props}
      mark={props.mark ?? ownMark(symbol, props.signedIn === true)}
    />
  );
}
