import type { AgentLoginSnapshot, AgentLoginAnswer } from '@repo/contracts';
import { createActor } from 'xstate';
import type { LoginAgentRequest } from './agent-launch';
import { LoginBrowser } from './login-browser';
import {
  loginMachine,
  type LoginActor,
  type LoginOutcome,
  type LoginMachineInput,
} from './login-machine';
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
    this.timer = this.startDeadline(deps.timeoutMs);
    this.actor = createActor(loginMachine, { input: this.ports() });
    this.actor.subscribe({ complete: (): void => this.completed.resolve() });
    this.actor.start();
  }
  private startDeadline(milliseconds: number): ReturnType<typeof setTimeout> {
    const timer = setTimeout(
      (): void => this.finish('timed-out'),
      milliseconds,
    );
    timer.unref();
    return timer;
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
    return {
      ...identity,
      status: this.status(),
      methods: this.resources.methods(),
      ...(this.browser.request() ? { request: this.browser.request() } : {}),
      ...(this.failure ? { failure: this.failure } : {}),
    };
  }
  public choose(methodId: string): void {
    if (!this.actor.getSnapshot().matches('choose-method'))
      throw new Error('Login is not choosing a method');
    if (!this.resources.methods().some((method) => method.id === methodId))
      throw new Error('Login method was not advertised');
    this.actor.send({ type: 'choose', methodId });
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
  private status(): AgentLoginSnapshot['status'] {
    const state = this.actor.getSnapshot();
    if (state.matches('finished')) return state.context.outcome;
    if (state.matches({ authenticating: 'awaiting-browser' }))
      return 'awaiting-browser';
    if (state.matches('authenticating')) return 'authenticating';
    const value = state.value;
    if (typeof value !== 'string' || value === 'finished')
      throw new Error('Unexpected login state');
    return value;
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
  private fail(error: unknown): void {
    this.failure = error instanceof Error ? error.message : String(error);
  }
}
