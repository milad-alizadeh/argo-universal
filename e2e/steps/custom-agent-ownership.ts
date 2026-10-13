import { readFile, writeFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { z } from 'zod';
import { expect } from '../fixtures';
import { Given, When, Then, test } from './fixtures';
import { query, mutate, mutateWithResult } from './server-query';

const ownedSession = z.object({ sessionId: z.string() });
const sessionPath = (): string =>
  test.info().outputPath('custom-owned-session.json');
const currentAgentId = (page: Page): string =>
  z.string().min(1).parse(new URL(page.url()).pathname.split('/').at(-1));
async function projectId(page: Page, httpUrl: string): Promise<string> {
  const projects = await query({
    page,
    httpUrl,
    procedure: 'projects.list',
    input: {},
    output: z.array(z.object({ id: z.string() })),
  });
  return z.string().parse(projects[0]?.id);
}
Given(
  'another App keeps a Session with that custom Agent open',
  async ({ page, app }): Promise<void> => {
    const created = await mutateWithResult({
      page,
      httpUrl: app.httpUrl,
      procedure: 'session.new',
      output: ownedSession,
      input: await sessionInput(page, app.httpUrl),
    });
    await writeFile(sessionPath(), JSON.stringify(created));
  },
);
When(
  'I save a custom Agent edit while its Session remains open',
  async ({ page }): Promise<void> => {
    await page.getByRole('link', { name: 'Edit', exact: true }).click();
    await page
      .getByRole('textbox', { name: 'Name', exact: true })
      .fill('Updated ACP');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
  },
);
Then(
  'the custom edit explains that the Agent is in use',
  async ({ page }): Promise<void> => {
    await expect(page.getByRole('alert')).toContainText('Agent is in use');
    await expect(
      page.getByRole('textbox', { name: 'Name', exact: true }),
    ).toHaveValue('Updated ACP');
    await expect(
      page.getByRole('button', { name: 'Save', exact: true }),
    ).toBeEnabled();
  },
);
When(
  'the other App closes its custom Agent Session',
  async ({ page, app }): Promise<void> => {
    const input = ownedSession.parse(
      JSON.parse(await readFile(sessionPath(), 'utf8')),
    );
    await mutate({
      page,
      httpUrl: app.httpUrl,
      procedure: 'session.close',
      input,
    });
  },
);
When(
  'I retry saving the custom Agent edit',
  async ({ page }): Promise<void> => {
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
  },
);

async function sessionInput(page: Page, httpUrl: string): Promise<object> {
  return {
    projectId: await projectId(page, httpUrl),
    agent: currentAgentId(page),
    checkout: { type: 'main' },
    configOptions: [],
    prompt: [{ type: 'text', text: 'Keep this Session open' }],
  };
}
