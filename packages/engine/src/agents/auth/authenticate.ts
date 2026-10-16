import type {
  AgentAuthenticateOutput,
  AgentAuthState,
  AgentLoginTerminalInput,
  AgentAuthTerminalFrame,
} from '@repo/contracts';
import type { AuthenticationMethod } from '../acp/auth-methods';
import { authenticationDescription } from '../acp/open-error';
import type { AgentLaunch, LaunchLoginTerminal } from '../agent-launch';
import { AuthTerminal } from './terminal-auth';

type AuthenticationInput = {
  launch: AgentLaunch;
  methods: AuthenticationMethod[];
  authenticate: (methodId: string) => Promise<void>;
  drop: () => void;
  settled: () => void;
  launchTerminal?: LaunchLoginTerminal;
};

type Attempt = {
  methodId: string;
  controller: AbortController;
  promise: Promise<AgentAuthenticateOutput>;
  terminal: boolean;
};

export const authenticationFailed = (
  cause: unknown,
): AgentAuthenticateOutput => ({
  status: 'failed',
  message: cause instanceof Error ? cause.message : String(cause),
});

const publicMethod = (
  method: AuthenticationMethod,
): AgentAuthState['methods'][number] => {
  const result: AgentAuthState['methods'][number] = {
    id: method.id,
    name: method.name,
    type: method.type,
  };

  if (method.description !== undefined) result.description = method.description;

  return result;
};

export class ConnectionAuthentication {
  private pending?: Attempt;
  private description?: string;
  private terminal?: AuthTerminal;
  private closed = false;
  public constructor(private readonly input: AuthenticationInput) {}
  public state(): AgentAuthState {
    const state: AgentAuthState = {
      methods: this.input.methods.map(publicMethod),
      pending: this.pending ? { methodId: this.pending.methodId } : null,
    };

    if (this.description !== undefined) state.description = this.description;

    return state;
  }
  public recordRequired(cause: unknown): void {
    this.description = authenticationDescription(cause);
  }
  public authenticate(methodId: string): Promise<AgentAuthenticateOutput> {
    return this.pending?.promise ?? this.begin(methodId);
  }
  private begin(methodId: string): Promise<AgentAuthenticateOutput> {
    if (this.closed)
      return Promise.resolve(authenticationFailed('The Agent has stopped'));

    const method = this.input.methods.find(
      (candidate) => candidate.id === methodId,
    );

    if (!method)
      return Promise.resolve(
        authenticationFailed('Unknown authentication method'),
      );

    return this.start(method);
  }
  private start(
    method: AuthenticationMethod,
  ): Promise<AgentAuthenticateOutput> {
    const controller = new AbortController();

    const promise = this.run(method, controller.signal)
      .then<AgentAuthenticateOutput>(() => ({ status: 'ok' }))
      .catch(authenticationFailed)
      .finally(() => {
        this.pending = undefined;
        this.input.settled();
      });

    this.rememberAttempt(method, controller, promise);

    return promise;
  }
  private rememberAttempt(
    method: AuthenticationMethod,
    controller: AbortController,
    promise: Promise<AgentAuthenticateOutput>,
  ): void {
    this.pending = {
      methodId: method.id,
      controller,
      promise,
      terminal: method.type === 'terminal',
    };
  }
  private async run(
    method: AuthenticationMethod,
    signal: AbortSignal,
  ): Promise<void> {
    if (method.type === 'terminal') return this.runTerminal(method, signal);
    await this.input.authenticate(method.id);
    signal.throwIfAborted();
  }
  private runTerminal(
    method: AuthenticationMethod,
    signal: AbortSignal,
  ): Promise<void> {
    this.terminal = new AuthTerminal(this.input.launchTerminal);

    const launch = {
      ...this.input.launch,
      args: [...this.input.launch.args, ...(method.args ?? [])],
      env: { ...this.input.launch.env, ...method.env },
    };

    return this.terminal.run({ launch, methodId: method.id, signal });
  }
  public async cancel(drop = true): Promise<void> {
    const pending = this.pending;

    if (!pending) return;
    pending.controller.abort(new Error('Sign-in cancelled'));
    this.dropProtocol(pending, drop);
    await pending.promise;
  }
  // The connection is stopping: no attempt starts after this, and a running one is cancelled.
  public close(): Promise<void> {
    this.closed = true;

    return this.cancel(false);
  }
  private dropProtocol(pending: Attempt, drop: boolean): void {
    if (!pending.terminal && drop) this.input.drop();
  }
  public readTerminal(cursor: number): AgentAuthTerminalFrame {
    return (
      this.terminal?.read(cursor) ?? { cursor: 0, output: '', closed: true }
    );
  }
  public inputTerminal(input: AgentLoginTerminalInput): void {
    if (!this.terminal) throw new Error('Sign-in terminal is not running');
    this.terminal.input(input);
  }
}
