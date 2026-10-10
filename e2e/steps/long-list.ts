import type { Page } from '@playwright/test';
import { z } from 'zod';
import { expect } from '../fixtures';
import { readAgent } from './agents';
import { Given, When, Then } from './fixtures';
import { query } from './server-query';

const titlePrefix = 'Long list Session';
const indexWidth = 3;

const Projects = z.array(z.object({ id: z.string() }));

function title(index: number): string {
  return `${titlePrefix} ${String(index).padStart(indexWidth, '0')}`;
}

function row(page: Page, index: number): ReturnType<Page['getByRole']> {
  return page.getByRole('button', { name: new RegExp(`^${title(index)}, `) });
}

async function firstProjectId(page: Page, httpUrl: string): Promise<string> {
  const [project] = await query({
    page,
    httpUrl,
    procedure: 'projects.list',
    input: {},
    output: Projects,
  });
  if (!project) throw new Error('The Server has no Project');
  return project.id;
}

function newSessionInput(session: {
  projectId: string;
  agent: string;
  title: string;
}): object {
  return {
    projectId: session.projectId,
    agent: session.agent,
    checkout: { type: 'main' },
    configOptions: [],
    prompt: [{ type: 'text', text: session.title }],
  };
}

async function startSession(
  page: Page,
  httpUrl: string,
  session: { projectId: string; agent: string; title: string },
): Promise<void> {
  const response = await page.request.post(`${httpUrl}/trpc/session.new`, {
    data: newSessionInput(session),
  });
  expect(response.ok()).toBe(true);
}

async function seedSessions(
  page: Page,
  httpUrl: string,
  count: number,
): Promise<void> {
  const projectId = await firstProjectId(page, httpUrl);
  const { agent } = await readAgent(page, httpUrl, 1);
  for (let index = 1; index <= count; index += 1)
    await startSession(page, httpUrl, {
      projectId,
      agent,
      title: title(index),
    });
}

Given(
  '{int} long-list Sessions',
  async ({ page, server }, count: number): Promise<void> => {
    await seedSessions(page, server.httpUrl, count);
    await page.reload();
  },
);

When(
  'I scroll the Sessions list to the end',
  async ({ page }): Promise<void> => {
    const list = page.getByTestId('sessions-scroll');
    // The first page holds the newest Sessions, so the oldest is not loaded yet.
    await expect(row(page, 1)).toHaveCount(0);
    await expect
      .poll(async () => {
        await list.evaluate((element) => {
          element.scrollTop = element.scrollHeight;
        });
        return row(page, 1).count();
      })
      .toBe(1);
  },
);

Then(
  'the Sessions list shows the oldest Session',
  async ({ page }): Promise<void> => {
    // The oldest Session is on the second page, so seeing it proves the list loaded more.
    await expect(row(page, 1)).toBeVisible();
  },
);
