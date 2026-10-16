import type {
  InitializeResponse,
  ParamsParser,
} from '@agentclientprotocol/sdk';
import type { AuthStatus, AuthStatusUpdateNotification } from '@repo/contracts';
import schema from '@repo/contracts/auth-status-schema' with { type: 'json' };
import { createRejectionCounter } from '@repo/machine-log';
import { Ajv } from 'ajv';
import { compileSchema } from '../connection/schema-reader';
import type { LoginAgentOutcome } from './subscription-status';
import { reportsAuthStatus, subscriptionOutcome } from './subscription-status';

const compiled = compileSchema<AuthStatusUpdateNotification>(
  new Ajv({ strict: false }),
  schema,
  {
    rejected: 'Rejected authentication status',
    invalid: (): string => 'Invalid ACP authentication status',
  },
);

const reader = compiled.reader(
  createRejectionCounter('ACP authentication status'),
);

const accountReportTimeoutMs = 5000;

export const authStatusNotification = '_auth/status_update';

export const createAuthStatusReader = (
  reject: () => void = () => {},
): ParamsParser<AuthStatusUpdateNotification> => ({
  parse: (value): AuthStatusUpdateNotification => {
    if (compiled.accepts(value)) return value;
    reject();

    return reader.parse(value);
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
    if (!reportsAuthStatus(initialization)) return subscriptionOutcome();
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
}
