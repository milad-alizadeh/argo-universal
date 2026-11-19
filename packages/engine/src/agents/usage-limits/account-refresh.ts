import { setTimeout as delay } from 'node:timers/promises';
import type { AgentAuthSubject, UsageLimit } from '@repo/contracts';
import { readAccountUsage } from '../account-usage-process';
import type { AccountUsageReader } from '../account-usage-protocol';
import type { AgentLaunch } from '../agent-launch';
import { accountUsageOf } from '../vendor';
import { type UsageLimits, subjectKey } from './usage-limits';

const refreshIntervalMs = 30_000;

type Request = {
  launch: AgentLaunch;
  signal: AbortSignal;
  reason: 'open' | 'turn';
};

type Refresh = {
  at: number;
  signal: AbortSignal;
  pending: boolean;
};

type Read = {
  request: Request;
  reader: AccountUsageReader;
  subject: AgentAuthSubject;
};

function stillPending(refresh: Refresh | undefined): boolean {
  if (!refresh) return false;

  return refresh.pending && !refresh.signal.aborted;
}

function waitForRefresh(previous: Refresh | undefined): number {
  if (!previous || previous.signal.aborted) return 0;

  return Math.max(0, previous.at + refreshIntervalMs - Date.now());
}

function shouldSkipOpen(wait: number, reason: Request['reason']): boolean {
  return wait > 0 && reason === 'open';
}

export class AccountUsageRefresh {
  private readonly latest = new Map<string, Refresh>();
  public constructor(private readonly limits: UsageLimits) {}

  public request(request: Request): void {
    const { launch, signal } = request;
    const reader = accountUsageOf(launch);

    if (!reader || signal.aborted) return;
    const subject = { agent: launch.agentId, projectId: launch.projectId };

    this.schedule({ request, reader, subject });
  }
  private schedule(read: Read): void {
    const key = subjectKey(read.subject);
    const previous = this.latest.get(key);

    if (stillPending(previous)) return;
    const wait = waitForRefresh(previous);

    if (shouldSkipOpen(wait, read.request.reason)) return;
    this.start(read, { key, wait });
  }
  private start(
    read: Read,
    { key, wait }: { key: string; wait: number },
  ): void {
    const { signal } = read.request;
    const refresh = { at: Date.now() + wait, signal, pending: wait > 0 };
    this.latest.set(key, refresh);

    void this.run(read, refresh, wait).catch(() => {
      // A failed read leaves the latest account and ACP readings available.
    });
  }
  private async run(read: Read, refresh: Refresh, wait: number): Promise<void> {
    const { launch, signal } = read.request;

    if (wait > 0) await delay(wait, undefined, { signal, ref: false });
    refresh.pending = false;
    const readings = await readAccountUsage(launch, read.reader, signal);

    if (signal.aborted) return;
    this.publish(read.subject, readings);
  }
  private publish(
    subject: AgentAuthSubject,
    readings: UsageLimit[] | undefined,
  ): void {
    if (readings) this.limits.publishAccount(subject, readings);
  }
}
