import { useState } from 'react';
import { Linking } from 'react-native';
import { useConnectionState } from '#features/connection';
import type { AgentLoginSheetProps } from '../components/agent-login-sheet/login-props';
import type { OwnedLogin } from './login-operation';
import { useLoginActions } from './use-login-actions';
import { useLoginSnapshot } from './use-login-snapshot';
type Sheet = Omit<AgentLoginSheetProps, 'agentName'>;
type AgentLogin = { start: () => void; sheet: Sheet | undefined };

export function useAgentLogin(agentId: string): AgentLogin {
  const [operation, setOperation] = useState<OwnedLogin>();
  const failure = useLoginFailure();
  const actions = useLoginActions({
    agentId,
    operation,
    setOperation,
    onError: failure.onError,
    clearFailure: failure.clear,
  });
  const opening = useOpenLogin(actions.start, failure);
  const sheet = useLoginSheet({ operation, actions, opening, failure });
  return { start: opening.start, sheet };
}
type LoginSheetInput = {
  operation: OwnedLogin | undefined;
  actions: ReturnType<typeof useLoginActions>;
  opening: Opening;
  failure: LoginFailure;
};
function useLoginSheet(input: LoginSheetInput): Sheet | undefined {
  const { operation, actions, opening, failure } = input;
  const query = useLoginSnapshot(operation, opening.open);
  const disconnected = useConnectionState() !== 'open';
  const sheet = {
    actions,
    query,
    disconnected,
    ...opening,
    failure: failure.message,
    onError: failure.onError,
  };
  return opening.open ? sheetProps(sheet) : undefined;
}

type Opening = { open: boolean; start: () => void; close: () => void };
function useOpenLogin(
  begin: () => Promise<void>,
  failure: LoginFailure,
): Opening {
  const [open, setOpen] = useState(false);
  const start = (): void => {
    setOpen(true);
    failure.clear();
    void begin().catch(failure.onError);
  };
  return { open, start, close: () => setOpen(false) };
}
type SheetInput = Opening & {
  actions: ReturnType<typeof useLoginActions>;
  query: ReturnType<typeof useLoginSnapshot>;
  disconnected: boolean;
  failure: string | undefined;
  onError: LoginFailure['onError'];
};
function sheetProps(input: SheetInput): Sheet {
  const { actions, query, disconnected, start, close, failure } = input;
  return {
    ...actions,
    busy: actions.busy || isStarting(input),
    snapshot: query.data,
    failure: queryFailure(query) ?? failure,
    disconnected,
    onOpenBrowser: (url) => openBrowser(url, input.onError),
    onRetry: start,
    onClose: close,
  };
}
function openBrowser(url: string, onError: LoginFailure['onError']): void {
  if (!/^https?:\/\//i.test(url))
    return onError(new Error('The Agent provided an unsupported sign-in URL.'));
  void Linking.openURL(url).catch(onError);
}

type LoginFailure = {
  message: string | undefined;
  clear: () => void;
  onError: (error: unknown) => void;
};
function useLoginFailure(): LoginFailure {
  const [message, setMessage] = useState<string>();
  return {
    message,
    clear: () => setMessage(undefined),
    onError: (error) => setMessage(failureMessage(error)),
  };
}
const failureMessage = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : 'Could not check sign-in. Reconnect and try again.';

const isStarting = (input: SheetInput): boolean =>
  !input.query.data && !input.failure;

const queryFailure = (
  query: ReturnType<typeof useLoginSnapshot>,
): string | undefined => query.error?.message;
