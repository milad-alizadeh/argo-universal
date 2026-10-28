import { authenticationFailed } from './auth-failure';

export { authenticationFailed } from './auth-failure';

import type {
  AgentAuthChange,
  AgentAuthenticateOutput,
  AgentAuthState,
  AgentAuthTerminalInput,
  AgentAuthTerminalFrame,
} from '@repo/contracts';
import {
  publicAuthenticationMethod,
  type AuthenticationMethod,
} from '../acp/auth-methods';
import { authenticationDescription, isAuthRequired } from '../acp/open-error';
import type { AgentLaunch, LaunchLoginTerminal } from '../agent-launch';
import { AuthTerminal } from './terminal-auth';
import { terminalMethodLaunch } from './terminal-program';

type AuthenticationInput = {
  launch: AgentLaunch;
  methods: AuthenticationMethod[];
  authenticate: (methodId: string) => Promise<void>;
  drop: () => void;
  settled: () => void;
  changed: (change: AgentAuthChange) => void;
  launchTerminal?: LaunchLoginTerminal;
};

type Attempt = {
  methodId: string;
  controller: AbortController;
  promise: Promise<AgentAuthenticateOutput>;
  terminal: boolean;
};

export class ConnectionAuthentication {
  private pending?: Attempt;
  private outcome: AgentAuthenticateOutput | null = null;
  private description?: string;
  private terminal?: AuthTerminal;
  private closed = false;
  public constructor(private readonly input: AuthenticationInput) {}
  public state(): AgentAuthState {
    const state: AgentAuthState = {
      methods: this.input.methods.map(publicAuthenticationMethod),
      pending: this.pending ? { methodId: this.pending.methodId } : null,
    };

    if (this.description !== undefined) state.description = this.description;

    return state;
  }
  // An open or a prompt failed with ACP `auth_required`: every App watching this Agent and Project can offer sign-in.
  public recordRequired(cause: unknown): void {
    if (!isAuthRequired(cause)) return;
    this.description = authenticationDescription(cause);
    this.publish();
  }
  public inheritRequired(description: string | undefined): void {
    if (description !== undefined) this.description = description;
  }
  private publish(): void {
    this.input.changed({ ...this.state(), outcome: this.outcome });
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
      .then((outcome) => {
        this.settle(outcome);

        return outcome;
      });

    this.rememberAttempt(method, controller, promise);
    this.publish();

    return promise;
  }
  private settle(outcome: AgentAuthenticateOutput): void {
    this.pending = undefined;
    this.outcome = outcome;
    this.publish();
    this.input.settled();
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

    return this.terminal.run({
      launch: terminalMethodLaunch(this.input.launch, method),
      methodId: method.id,
      signal,
    });
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
  public inputTerminal(input: AgentAuthTerminalInput): void {
    if (!this.terminal) throw new Error('Sign-in terminal is not running');
    this.terminal.input(input);
  }
}
