import type { CDPSession, Page } from '@playwright/test';
import { desktop, openApp } from './page.mts';
import { cycle, probe } from './soak-cycle.mts';
import { appMetrics, serverTree } from './soak-sample.mts';
import { port, type Soak } from './soak-state.mts';

const sampleEveryMs = Number(process.env.PERF_SOAK_SAMPLE_SECONDS ?? 60) * 1000;

const probeEveryMs = Number(process.env.PERF_SOAK_PROBE_MINUTES ?? 5) * 60_000;

interface Clock {
  nextSample: number;
  nextProbe: number;
}

async function sample(soak: Soak, cdp: CDPSession): Promise<void> {
  soak.samples.push({
    elapsedMs: performance.now() - soak.startedAt,
    cycle: soak.activity.cycles,
    app: await appMetrics(cdp),
    server: await serverTree(port(soak)),
  });
}

async function probeDue(soak: Soak, page: Page, clock: Clock): Promise<void> {
  if (performance.now() < clock.nextProbe) return;
  clock.nextProbe += probeEveryMs;
  await probe(page, soak);
}

async function sampleDue(
  soak: Soak,
  cdp: CDPSession,
  clock: Clock,
): Promise<void> {
  if (performance.now() < clock.nextSample) return;
  clock.nextSample += sampleEveryMs;
  await sample(soak, cdp);
}

interface Run {
  soak: Soak;
  page: Page;
  cdp: CDPSession;
  clock: Clock;
}

async function step({ soak, page, cdp, clock }: Run): Promise<void> {
  await probeDue(soak, page, clock);
  await cycle(page, soak);
  await sampleDue(soak, cdp, clock);
}

const timeLeft = ({ soak }: Run): boolean =>
  performance.now() < soak.startedAt + soak.minutes * 60_000;

// Cycles until the time is up, then takes one last probe and sample.
export async function soakFor(page: Page, soak: Soak): Promise<void> {
  const { serverUrl } = soak.server;
  const cdp = await openApp(page, { serverUrl, viewport: desktop });
  const clock = { nextSample: soak.startedAt, nextProbe: soak.startedAt };
  const run = { soak, page, cdp, clock };

  while (timeLeft(run)) await step(run);
  await probe(page, soak);
  await sample(soak, cdp);
}
