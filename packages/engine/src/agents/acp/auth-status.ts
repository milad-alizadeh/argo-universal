import type {
  InitializeResponse,
  ParamsParser,
} from '@agentclientprotocol/sdk';
import type { AuthStatus, AuthStatusUpdateNotification } from '@repo/contracts';
import schema from '@repo/contracts/auth-status-schema' with { type: 'json' };
import { createRejectionCounter } from '@repo/machine-log';
import { Ajv } from 'ajv';
import type { LoginAgentOutcome } from '..';
import { reportsAuthStatus, subscriptionOutcome } from './subscription-status';

const accepts = new Ajv({
  strict: false,
}).compile<AuthStatusUpdateNotification>(schema);

const rejections = createRejectionCounter('ACP authentication status');

const accountReportTimeoutMs = 5000;

export const authStatusNotification = '_auth/status_update';

export const createAuthStatusReader = (
  reject: () => void = () => {},
): ParamsParser<AuthStatusUpdateNotification> => ({
  parse: (value): AuthStatusUpdateNotification => {
    if (accepts(value)) return value;
    reject();
    const error = new TypeError('Invalid ACP authentication status');
    rejections.report('Rejected authentication status', error);
    throw error;
  },
});

export class AcpAuthenticationStatus {
  private current: AuthStatus | undefined;
  private activeFailure: ((error: Error) => void) | undefined;
  private readonly first = Promise.withResolvers<void>();
  public invalidate(): void {
    this.current = undefined;
    this.first.resolve();
    this.failActiveSubscription('Subscription account verification was lost');
  }
  public accept(notification: AuthStatusUpdateNotification): void {
    this.current = notification.authStatus;
    this.first.resolve();
    const outcome = subscriptionOutcome(this.current);

    if (outcome.status !== 'ready')
      this.failActiveSubscription(outcome.failure);
  }
  public guardActiveSubscription(failed: (error: Error) => void): void {
    this.activeFailure = failed;
    const outcome = subscriptionOutcome(this.current);

    if (outcome.status !== 'ready')
      this.failActiveSubscription(outcome.failure);
  }
  private failActiveSubscription(failure?: string): void {
    const failed = this.activeFailure;
    this.activeFailure = undefined;
    failed?.(new Error(failure));
  }
  public async check(
    initialization: InitializeResponse,
  ): Promise<LoginAgentOutcome> {
    // An Agent that does not report its account is Ready; an auth_required answer later marks it Sign-in needed.
    if (!reportsAuthStatus(initialization)) return { status: 'ready' };
    await this.waitForFirst();

    return subscriptionOutcome(this.current);
  }
  private async waitForFirst(): Promise<void> {
    const expired = Promise.withResolvers<void>();
    const timeout = setTimeout(() => expired.resolve(), accountReportTimeoutMs);
    timeout.unref();

    try {
      await Promise.race([this.first.promise, expired.promise]);
    } finally {
      clearTimeout(timeout);
    }
  }
  public async requireReady(initialization: InitializeResponse): Promise<void> {
    const result = await this.check(initialization);

    if (result.status !== 'ready') throw new Error(result.failure);
  }
}
