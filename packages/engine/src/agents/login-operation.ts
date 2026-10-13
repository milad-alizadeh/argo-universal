import type {
  AgentLoginSnapshot,
  AgentLoginAnswer,
  AgentLoginTerminalFrame,
  AgentLoginTerminalInput,
} from '@repo/contracts';
import { createActor } from 'xstate';
import type { LoginAgentRequest } from './agent-launch';
import { LoginBrowser } from './login-browser';
import { startLoginDeadline } from './login-deadline';
import {
  loginStatus,
  loginMachine,
  type LoginActor,
  type LoginOutcome,
  type LoginMachineInput,
} from './login-machine';
import { loginProgress } from './login-progress';
import { LoginResources, type LoginOperationDeps } from './login-resources';

type LoginIdentity = {
  operationId: string;
  agentId: string;
  ownerToken: string;
};

export class LoginOperation {
  private readonly actor: LoginActor;
  private readonly resources: LoginResources;
  private readonly timer: ReturnType<typeof setTimeout>;
  private readonly completed = Promise.withResolvers<void>();
  private readonly browser = new LoginBrowser({
    requested: (): void => this.actor.send({ type: 'request' }),
    answered: (): void => this.actor.send({ type: 'answer' }),
    cancelled: (): void => this.cancel(),
  });
  private failure?: string;

  public constructor(
    private readonly identity: LoginIdentity,
    deps: LoginOperationDeps,
  ) {
    this.resources = new LoginResources(
      identity.agentId,
      deps,
      (request, signal) => this.elicit(request, signal),
    );
    const expired = (): void => this.finish('timed-out');
    this.timer = startLoginDeadline(expired, deps.timeoutMs);
    this.actor = createActor(loginMachine, { input: this.ports() });
    this.start();
  }
  private start(): void {
    this.actor.subscribe({ complete: (): void => this.completed.resolve() });
    this.actor.start();
  }
  public isOwnedBy(token: string): boolean {
    return token === this.identity.ownerToken;
  }
  public blocksMutation(): boolean {
    return (
      this.actor.getSnapshot().status === 'active' ||
      this.actor.getSnapshot().matches('cleanup-failed')
    );
  }
  public snapshot(token: string): AgentLoginSnapshot {
    const { operationId, agentId } = this.identity;
    const identity = { operationId, agentId };

    if (!this.isOwnedBy(token))
      return { ...identity, status: 'other-app', methods: [] };

    const snapshot: AgentLoginSnapshot = {
      ...identity,
      status: loginStatus(this.actor.getSnapshot()),
      methods: this.resources.methods(),
      ...loginProgress(this.isTerminalRunning(), this.browser.request()),
    };

    if (this.failure) snapshot.failure = this.failure;

    return snapshot;
  }
  public choose(methodId: string): void {
    if (!this.actor.getSnapshot().matches('choose-method'))
      throw new Error('Login is not choosing a method');

    if (!this.resources.methods().some((method) => method.id === methodId))
      throw new Error('Login method was not advertised');
    this.actor.send({ type: 'choose', methodId });
  }
  public readTerminal(cursor: number): AgentLoginTerminalFrame {
    if (!this.isTerminalRunning()) return { cursor, output: '', closed: true };

    return this.resources.readTerminal(cursor);
  }
  public inputTerminal(input: AgentLoginTerminalInput): void {
    this.requireTerminal();
    this.resources.inputTerminal(input);
  }
  private requireTerminal(): void {
    if (!this.isTerminalRunning())
      throw new Error('The sign-in terminal is not running');
  }
  private isTerminalRunning(): boolean {
    return (
      this.actor.getSnapshot().matches('authenticating') &&
      this.resources.terminalActive()
    );
  }
  public respond(input: Pick<AgentLoginAnswer, 'requestId' | 'action'>): void {
    this.browser.respond(input);
  }
  public cancel(): void {
    if (this.actor.getSnapshot().status === 'active') this.finish('cancelled');
  }
  public async shutdown(): Promise<void> {
    this.cancel();
    await this.completed.promise;

    if (this.actor.getSnapshot().matches('cleanup-failed'))
      throw new Error(this.failure ?? 'Login cleanup failed');
  }
  private ports(): LoginMachineInput {
    return {
      open: () => this.resources.open(),
      authenticate: (methodId) => this.resources.authenticate(methodId),
      checkReady: () => this.checkReady(),
      close: () => this.resources.close(),
      abort: () => this.abortLogin(),
      fail: (error) => this.fail(error),
    };
  }
  private elicit(
    request: LoginAgentRequest,
    signal?: AbortSignal,
  ): Promise<{ action: 'accept' | 'cancel' }> {
    if (!this.actor.getSnapshot().matches({ authenticating: 'waiting' }))
      return Promise.reject(new Error('Unexpected login request'));

    return this.browser.create(request, signal);
  }
  private async checkReady(): ReturnType<LoginResources['checkReady']> {
    const outcome = await this.resources.checkReady();
    this.failure = outcome.failure;

    return outcome;
  }
  private finish(outcome: LoginOutcome): void {
    this.actor.send({ type: 'finish', outcome });
  }
  private abortLogin(): void {
    clearTimeout(this.timer);
    this.resources.abortLogin();
    this.browser.cancel();
  }
  private fail(cause: unknown): void {
    this.failure = cause instanceof Error ? cause.message : String(cause);
  }
}
