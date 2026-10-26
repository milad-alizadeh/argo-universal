import type { Page, WebSocket } from '@playwright/test';
import { z } from 'zod';
import { expect } from '../fixtures';
import { Given, When, Then } from './fixtures';
import { onPhone } from './frame';
import { openRunningShell } from './shells';
import { framesMatching } from './web-socket-frames';

const ShellRead = z.object({
  id: z.number(),
  method: z.literal('subscription'),
  params: z.object({ path: z.literal('shell.output') }),
});

const EndRead = z.object({
  id: z.number(),
  method: z.literal('subscription.stop'),
});

const reads = new WeakMap<Page, Set<number>[]>();

function observeReads(socket: WebSocket, active: Set<number>): void {
  socket.on('framesent', ({ payload }) => {
    for (const read of framesMatching(payload, ShellRead)) active.add(read.id);

    for (const end of framesMatching(payload, EndRead)) active.delete(end.id);
  });
  socket.on('close', () => active.clear());
}

Given('Shell output reads are observed', async ({ page }) => {
  const sockets: Set<number>[] = [];
  reads.set(page, sockets);
  page.on('websocket', (socket) => {
    const active = new Set<number>();
    sockets.push(active);
    observeReads(socket, active);
  });
});

async function closeShellOutput(page: Page): Promise<void> {
  await (onPhone(page)
    ? page.keyboard.press('Escape')
    : page.getByRole('button', { name: 'Close Shells', exact: true }).click());
}

When('I close the Shell output', async ({ page }) => {
  await closeShellOutput(page);
});

const openReadCount = (page: Page): number =>
  (reads.get(page) ?? []).reduce((total, active) => total + active.size, 0);

Given('the Shell output is closed', async ({ page }) => {
  await closeShellOutput(page);
  await expect.poll(() => openReadCount(page)).toBe(0);
});

When('I reopen the Shell output', async ({ page }) => {
  await openRunningShell(page);
});

Then('no Shell output read remains open', async ({ page }) => {
  await expect.poll(() => openReadCount(page)).toBe(0);
});

When('I return to the Shells list', async ({ page }) => {
  await page
    .getByRole('button', { name: 'Back to Shells', exact: true })
    .click();
});

Then('one Shell output read is open', async ({ page }) => {
  await expect.poll(() => openReadCount(page)).toBe(1);
});
